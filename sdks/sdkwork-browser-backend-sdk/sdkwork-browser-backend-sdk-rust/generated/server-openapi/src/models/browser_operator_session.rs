use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BrowserOperatorSession {
    #[serde(rename = "sessionId")]
    pub session_id: String,

    pub kind: String,

    #[serde(rename = "activeEngineId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub active_engine_id: Option<String>,

    #[serde(rename = "activeTabId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub active_tab_id: Option<String>,

    #[serde(rename = "tabCount")]
    pub tab_count: i64,

    #[serde(rename = "agentRuntimeId")]
    pub agent_runtime_id: String,

    #[serde(rename = "runtimeMode")]
    pub runtime_mode: String,

    #[serde(rename = "mcpConnectorCount")]
    pub mcp_connector_count: i64,

    #[serde(rename = "observedAtUnix")]
    pub observed_at_unix: i64,
}
