use sdkwork_browser_agent_service::BrowserAiActionRequest;
use serde::Deserialize;

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserOperationCommand {
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub target_url: Option<String>,
    #[serde(default)]
    pub tab_id: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub engine_id: Option<String>,
    #[serde(default)]
    pub connector_id: Option<String>,
    #[serde(default)]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub arguments: Option<serde_json::Value>,
    #[serde(default)]
    pub stream: Option<bool>,
}

impl BrowserOperationCommand {
    pub fn into_ai_request(self) -> BrowserAiActionRequest {
        BrowserAiActionRequest {
            action: self.action,
            target_url: self.target_url,
            tab_id: self.tab_id,
            message: self.message,
            engine_id: self.engine_id,
        }
    }
}