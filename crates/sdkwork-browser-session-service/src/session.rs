use sdkwork_browser_shared_service::new_entity_uuid;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrowserSessionKind {
    Persistent,
    Temporary,
    Isolated,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserSession {
    pub id: Uuid,
    pub account_label: String,
    pub kind: BrowserSessionKind,
}

#[derive(Default)]
pub struct BrowserSessionService {
    sessions: Vec<BrowserSession>,
}

impl BrowserSessionService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn create(
        &mut self,
        account_label: impl Into<String>,
        kind: BrowserSessionKind,
    ) -> &BrowserSession {
        let session = BrowserSession {
            id: new_entity_uuid(),
            account_label: account_label.into(),
            kind,
        };
        self.sessions.push(session);
        self.sessions.last().expect("session pushed")
    }

    pub fn list(&self) -> &[BrowserSession] {
        &self.sessions
    }
}
