use serde_json::{json, Value};
use std::io::Write;
use std::process::{Command, Stdio};

pub const MOCK_STDIO_COMMAND: &str = "browser-mcp-mock";

pub fn build_tools_call_request(tool_name: &str, arguments: &Value) -> String {
    json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments,
        }
    })
    .to_string()
}

pub fn round_trip(command: &str, request_json: &str) -> Result<String, String> {
    if command == MOCK_STDIO_COMMAND {
        return Ok(mock_response(request_json));
    }

    let (program, args) = crate::shell::parse_command(command)
        .ok_or_else(|| format!("invalid MCP stdio command: {command}"))?;
    let mut child = Command::new(program)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("failed to spawn MCP stdio process: {error}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(request_json.as_bytes())
            .map_err(|error| format!("failed to write MCP stdio request: {error}"))?;
        stdin
            .write_all(b"\n")
            .map_err(|error| format!("failed to finalize MCP stdio request: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("failed to read MCP stdio response: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "MCP stdio process exited with {}: {}",
            output.status, stderr
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        return Err("MCP stdio process returned empty stdout".into());
    }
    Ok(stdout)
}

pub fn extract_text_response(raw: &str) -> Result<String, String> {
    let value: Value =
        serde_json::from_str(raw).map_err(|error| format!("invalid MCP JSON response: {error}"))?;
    if let Some(error) = value.get("error") {
        return Err(error.to_string());
    }
    if let Some(text) = value
        .pointer("/result/content/0/text")
        .and_then(Value::as_str)
    {
        return Ok(text.to_string());
    }
    if let Some(message) = value.pointer("/result/message").and_then(Value::as_str) {
        return Ok(message.to_string());
    }
    Ok(raw.to_string())
}

fn mock_response(request_json: &str) -> String {
    let request: Value = serde_json::from_str(request_json).unwrap_or(json!({}));
    let tool_name = request
        .pointer("/params/name")
        .and_then(Value::as_str)
        .unwrap_or("tool");
    json!({
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
            "content": [{
                "type": "text",
                "text": format!("mock stdio completed for {tool_name}")
            }]
        }
    })
    .to_string()
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mock_stdio_returns_json_rpc_payload() {
        let request = build_tools_call_request("search_repositories", &json!({ "query": "sdkwork" }));
        let raw = round_trip(MOCK_STDIO_COMMAND, &request).expect("mock response");
        let text = extract_text_response(&raw).expect("text");
        assert!(text.contains("search_repositories"));
    }
}
