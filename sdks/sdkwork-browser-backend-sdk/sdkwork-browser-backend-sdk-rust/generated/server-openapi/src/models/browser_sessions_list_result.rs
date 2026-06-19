use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BrowserSessionsListResult {
    pub code: String,

    pub message: String,

    #[serde(rename = "requestId")]
    pub request_id: String,

    pub data: std::collections::HashMap<String, serde_json::Value>,
}
