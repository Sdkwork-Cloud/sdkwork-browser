use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AgentProviderDiagnostic {
    #[serde(rename = "providerId")]
    pub provider_id: String,

    #[serde(rename = "providerFamily")]
    pub provider_family: String,

    #[serde(rename = "providerVersion")]
    pub provider_version: String,

    #[serde(rename = "typedRegistered")]
    pub typed_registered: bool,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub health: Option<serde_json::Value>,

    pub capabilities: Vec<String>,
}
