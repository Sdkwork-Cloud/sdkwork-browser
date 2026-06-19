use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sdkwork_browser_abstraction_service::{BrowserPlugin, BrowserPluginKind};

use crate::stdio_session;
use crate::stdio_transport;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpConnector {
    pub id: String,
    pub display_name: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolDescriptor {
    pub connector_id: String,
    pub name: String,
    pub description: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolInvokeRequest {
    pub connector_id: String,
    pub tool_name: String,
    #[serde(default)]
    pub arguments: Value,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolInvokeResult {
    pub code: String,
    pub connector_id: String,
    pub tool_name: String,
    pub message: String,
    #[serde(default)]
    pub data: Value,
}

pub struct BrowserMcpService {
    runtime_id: &'static str,
    connectors: Vec<McpConnector>,
}

impl BrowserMcpService {
    pub fn new() -> Self {
        Self {
            runtime_id: "sdkwork-mcp-runtime",
            connectors: vec![
                McpConnector {
                    id: "github".into(),
                    display_name: "GitHub".into(),
                },
                McpConnector {
                    id: "notion".into(),
                    display_name: "Notion".into(),
                },
            ],
        }
    }

    pub fn runtime_id(&self) -> &str {
        self.runtime_id
    }

    pub fn connectors(&self) -> &[McpConnector] {
        &self.connectors
    }

    pub fn list_tools(&self) -> Vec<McpToolDescriptor> {
        let mut tools = Vec::new();
        for connector in &self.connectors {
            match connector.id.as_str() {
                "github" => {
                    tools.push(McpToolDescriptor {
                        connector_id: connector.id.clone(),
                        name: "search_repositories".into(),
                        description: "Search GitHub repositories by keyword.".into(),
                    });
                    tools.push(McpToolDescriptor {
                        connector_id: connector.id.clone(),
                        name: "get_pull_request".into(),
                        description: "Fetch pull request metadata.".into(),
                    });
                }
                "notion" => {
                    tools.push(McpToolDescriptor {
                        connector_id: connector.id.clone(),
                        name: "search_pages".into(),
                        description: "Search Notion workspace pages.".into(),
                    });
                    tools.push(McpToolDescriptor {
                        connector_id: connector.id.clone(),
                        name: "create_page".into(),
                        description: "Create a Notion page from markdown.".into(),
                    });
                }
                _ => {}
            }
        }
        tools
    }

    pub fn invoke_tool(&self, request: &McpToolInvokeRequest) -> McpToolInvokeResult {
        let transport = std::env::var("BROWSER_MCP_TRANSPORT")
            .unwrap_or_else(|_| "stub".into())
            .to_ascii_lowercase();
        if transport == "stdio" {
            return self.invoke_tool_stdio(request);
        }
        self.invoke_tool_stub(request, "stub")
    }

    fn invoke_tool_stdio(&self, request: &McpToolInvokeRequest) -> McpToolInvokeResult {
        let command = std::env::var("BROWSER_MCP_STDIO_COMMAND")
            .unwrap_or_else(|_| stdio_transport::MOCK_STDIO_COMMAND.into());
        let payload = stdio_transport::build_tools_call_request(&request.tool_name, &request.arguments);

        let payload = stdio_session::invoke_stdio(&command, &payload);

        match payload {
            Ok(raw) => match stdio_transport::extract_text_response(&raw) {
                Ok(message) => McpToolInvokeResult {
                    code: "OK".into(),
                    connector_id: request.connector_id.clone(),
                    tool_name: request.tool_name.clone(),
                    message,
                    data: json!({
                        "transport": "stdio",
                        "stdioCommand": command,
                        "raw": raw,
                    }),
                },
                Err(error) => McpToolInvokeResult {
                    code: "ERROR".into(),
                    connector_id: request.connector_id.clone(),
                    tool_name: request.tool_name.clone(),
                    message: error,
                    data: json!({ "transport": "stdio", "stdioCommand": command }),
                },
            },
            Err(error) => {
                let mut fallback = self.invoke_tool_stub(request, "stdio-fallback");
                fallback.message = format!("{error}; fallback: {}", fallback.message);
                fallback
            }
        }
    }

    fn invoke_tool_stub(&self, request: &McpToolInvokeRequest, transport: &str) -> McpToolInvokeResult {
        let Some(connector) = self
            .connectors
            .iter()
            .find(|item| item.id == request.connector_id)
        else {
            return McpToolInvokeResult {
                code: "NOT_FOUND".into(),
                connector_id: request.connector_id.clone(),
                tool_name: request.tool_name.clone(),
                message: "Unknown MCP connector.".into(),
                data: json!({}),
            };
        };

        let tool = self
            .list_tools()
            .into_iter()
            .find(|tool| {
                tool.connector_id == request.connector_id && tool.name == request.tool_name
            });

        if tool.is_none() {
            return McpToolInvokeResult {
                code: "NOT_FOUND".into(),
                connector_id: request.connector_id.clone(),
                tool_name: request.tool_name.clone(),
                message: format!("Tool '{}' is not registered for {}.", request.tool_name, connector.display_name),
                data: json!({}),
            };
        }

        let query = request
            .arguments
            .get("query")
            .or_else(|| request.arguments.get("title"))
            .and_then(Value::as_str)
            .unwrap_or("sdkwork-browser");

        McpToolInvokeResult {
            code: "OK".into(),
            connector_id: request.connector_id.clone(),
            tool_name: request.tool_name.clone(),
            message: format!(
                "{}::{} completed for '{query}' via sdkwork-mcp-runtime {transport} transport.",
                connector.display_name, request.tool_name
            ),
            data: json!({
                "connector": connector.id,
                "query": query,
                "transport": transport,
            }),
        }
    }
}

impl Default for BrowserMcpService {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserPlugin for BrowserMcpService {
    fn id(&self) -> &str {
        "sdkwork-browser-mcp"
    }

    fn kind(&self) -> BrowserPluginKind {
        BrowserPluginKind::Mcp
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_tools_for_connectors() {
        let service = BrowserMcpService::new();
        assert!(service.list_tools().len() >= 4);
    }

    #[test]
    fn invokes_github_search_tool() {
        let service = BrowserMcpService::new();
        let result = service.invoke_tool(&McpToolInvokeRequest {
            connector_id: "github".into(),
            tool_name: "search_repositories".into(),
            arguments: json!({ "query": "browser ai" }),
        });
        assert_eq!(result.code, "OK");
        assert!(result.message.contains("browser ai"));
    }

    #[test]
    fn stdio_transport_adds_command_metadata() {
        std::env::set_var("BROWSER_MCP_TRANSPORT", "stdio");
        std::env::set_var("BROWSER_MCP_STDIO_COMMAND", stdio_transport::MOCK_STDIO_COMMAND);
        let service = BrowserMcpService::new();
        let result = service.invoke_tool(&McpToolInvokeRequest {
            connector_id: "github".into(),
            tool_name: "search_repositories".into(),
            arguments: json!({ "query": "sdkwork" }),
        });
        assert_eq!(result.code, "OK");
        assert!(result.message.contains("mock stdio completed"));
        assert_eq!(result.data["transport"], "stdio");
        std::env::remove_var("BROWSER_MCP_TRANSPORT");
        std::env::remove_var("BROWSER_MCP_STDIO_COMMAND");
    }
}
