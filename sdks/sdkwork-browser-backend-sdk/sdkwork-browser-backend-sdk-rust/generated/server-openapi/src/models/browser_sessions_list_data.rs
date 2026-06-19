use serde::{Deserialize, Serialize};

use crate::models::{AgentRuntimeDiagnostics, BrowserOperatorSession};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BrowserSessionsListData {
    pub sessions: Vec<BrowserOperatorSession>,

    #[serde(rename = "agentDiagnostics")]
    pub agent_diagnostics: AgentRuntimeDiagnostics,
}
