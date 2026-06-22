//! Shared MCP stdio command parsing.
//!
//! Parses a command string into program + args WITHOUT going through a shell.
//! This eliminates shell-injection risk: arguments are passed directly to the
//! OS exec syscall, so shell metacharacters (`;`, `|`, `&&`, `$()`) have no
//! special meaning.
//!
//! The command string is split on whitespace using a simple state machine that
//! respects double-quoted segments. This is intentionally minimal — operators
//! are expected to configure `BROWSER_MCP_STDIO_COMMAND` with a program path
//! followed by arguments, not a shell pipeline.

/// Parse a command string into (program, args) without invoking a shell.
///
/// Rules:
/// - Splits on whitespace outside double quotes.
/// - Double-quoted segments are kept as a single argument (quotes removed).
/// - Single quotes are treated literally (no special handling) to keep the
///   parser minimal and predictable.
/// - Empty input returns `None`.
///
/// # Security
///
/// This function never invokes a shell. Even if the input contains `;`, `|`,
/// `&&`, `$VAR`, or backticks, those characters are passed verbatim to the
/// target program as arguments. This closes the command-injection vector
/// present in the previous `cmd /C <command>` / `sh -c <command>` approach.
pub fn parse_command(command: &str) -> Option<(String, Vec<String>)> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut tokens: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_double_quote = false;
    let mut has_token = false;

    for ch in trimmed.chars() {
        match ch {
            '"' => {
                in_double_quote = !in_double_quote;
                has_token = true;
            }
            c if c.is_whitespace() && !in_double_quote => {
                if has_token {
                    tokens.push(std::mem::take(&mut current));
                    has_token = false;
                }
            }
            c => {
                current.push(c);
                has_token = true;
            }
        }
    }
    if has_token {
        tokens.push(current);
    }

    let mut iter = tokens.into_iter();
    let program = iter.next()?;
    let args = iter.collect();
    Some((program, args))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_command() {
        let (program, args) = parse_command("node /usr/local/bin/mcp-server.js").expect("parse");
        assert_eq!(program, "node");
        assert_eq!(args, vec!["/usr/local/bin/mcp-server.js".to_string()]);
    }

    #[test]
    fn parses_quoted_argument_with_spaces() {
        let (program, args) =
            parse_command("node \"/path with spaces/mcp-server.js\" --port 3000").expect("parse");
        assert_eq!(program, "node");
        assert_eq!(
            args,
            vec![
                "/path with spaces/mcp-server.js".to_string(),
                "--port".to_string(),
                "3000".to_string(),
            ]
        );
    }

    #[test]
    fn shell_metacharacters_are_passed_verbatim() {
        // `; rm -rf /` must NOT be interpreted as a shell command separator.
        let (program, args) = parse_command("node server.js; rm -rf /").expect("parse");
        assert_eq!(program, "node");
        assert_eq!(
            args,
            vec![
                "server.js;".to_string(),
                "rm".to_string(),
                "-rf".to_string(),
                "/".to_string(),
            ]
        );
    }

    #[test]
    fn empty_command_returns_none() {
        assert!(parse_command("").is_none());
        assert!(parse_command("   ").is_none());
    }

    #[test]
    fn single_program_no_args() {
        let (program, args) = parse_command("mcp-server").expect("parse");
        assert_eq!(program, "mcp-server");
        assert!(args.is_empty());
    }
}
