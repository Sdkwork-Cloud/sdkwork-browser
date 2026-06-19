use serde::{Deserialize, Serialize};

use crate::models::{AgentProviderDiagnostic};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AgentRuntimeDiagnostics {
    #[serde(rename = "schemaVersion")]
    pub schema_version: String,

    #[serde(rename = "runtimeId")]
    pub runtime_id: String,

    #[serde(rename = "agentId")]
    pub agent_id: String,

    pub state: String,

    #[serde(rename = "providerCount")]
    pub provider_count: i64,

    #[serde(rename = "capabilityCount")]
    pub capability_count: i64,

    #[serde(rename = "typedProviderCount")]
    pub typed_provider_count: i64,

    #[serde(rename = "manifestOnlyProviderCount")]
    pub manifest_only_provider_count: i64,

    #[serde(rename = "missingRequiredCapabilities")]
    pub missing_required_capabilities: Vec<String>,

    #[serde(rename = "degradedCapabilities")]
    pub degraded_capabilities: Vec<String>,

    #[serde(rename = "providerDiagnostics")]
    pub provider_diagnostics: Vec<AgentProviderDiagnostic>,

    #[serde(rename = "runtimeMode")]
    pub runtime_mode: String,
}
