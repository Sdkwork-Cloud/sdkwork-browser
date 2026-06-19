use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use crate::stdio_transport::{self, MOCK_STDIO_COMMAND};

struct StdioSession {
    child: Child,
}

impl StdioSession {
    fn spawn(command: &str) -> Result<Self, String> {
        if command == MOCK_STDIO_COMMAND {
            return Err("mock transport uses stateless round trip".into());
        }
        let (program, args) = shell_command(command);
        let child = Command::new(program)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| format!("failed to spawn persistent MCP process: {error}"))?;
        if child.stdin.is_none() || child.stdout.is_none() {
            return Err("persistent MCP process missing stdio pipes".into());
        }
        Ok(Self { child })
    }

    fn invoke(&mut self, request_json: &str) -> Result<String, String> {
        let stdin = self
            .child
            .stdin
            .as_mut()
            .ok_or_else(|| "MCP stdin unavailable".to_string())?;
        stdin
            .write_all(request_json.as_bytes())
            .map_err(|error| format!("failed to write MCP request: {error}"))?;
        stdin
            .write_all(b"\n")
            .map_err(|error| format!("failed to finalize MCP request: {error}"))?;
        stdin
            .flush()
            .map_err(|error| format!("failed to flush MCP request: {error}"))?;

        let stdout = self
            .child
            .stdout
            .as_mut()
            .ok_or_else(|| "MCP stdout unavailable".to_string())?;
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .map_err(|error| format!("failed to read MCP response: {error}"))?;
        if line.trim().is_empty() {
            return Err("MCP process returned empty response line".into());
        }
        Ok(line.trim().to_string())
    }
}

static STDIO_SESSION: Mutex<Option<StdioSession>> = Mutex::new(None);

pub fn invoke_persistent(command: &str, request_json: &str) -> Result<String, String> {
    let mut guard = STDIO_SESSION
        .lock()
        .map_err(|_| "MCP stdio session lock poisoned".to_string())?;

    if guard.is_none() {
        *guard = Some(StdioSession::spawn(command)?);
    }

    let session = guard
        .as_mut()
        .ok_or_else(|| "MCP stdio session missing after spawn".to_string())?;

    match session.invoke(request_json) {
        Ok(response) => Ok(response),
        Err(error) => {
            *guard = None;
            Err(error)
        }
    }
}

pub fn should_use_persistent_stdio() -> bool {
    std::env::var("BROWSER_MCP_STDIO_PERSIST")
        .map(|value| {
            let normalized = value.to_ascii_lowercase();
            normalized == "1" || normalized == "true" || normalized == "yes"
        })
        .unwrap_or(false)
}

pub fn invoke_stdio(command: &str, request_json: &str) -> Result<String, String> {
    if should_use_persistent_stdio() {
        if let Ok(response) = invoke_persistent(command, request_json) {
            return Ok(response);
        }
    }
    stdio_transport::round_trip(command, request_json)
}

#[cfg(windows)]
fn shell_command(command: &str) -> (String, Vec<String>) {
    ("cmd".to_string(), vec!["/C".to_string(), command.to_string()])
}

#[cfg(not(windows))]
fn shell_command(command: &str) -> (String, Vec<String>) {
    ("sh".to_string(), vec!["-c".to_string(), command.to_string()])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn persistent_flag_defaults_false() {
        std::env::remove_var("BROWSER_MCP_STDIO_PERSIST");
        assert!(!should_use_persistent_stdio());
    }
}
