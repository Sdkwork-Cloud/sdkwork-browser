use sdkwork_browser_shared_service::{new_entity_uuid, text_matches_query};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserHistoryEntry {
    pub id: Uuid,
    pub title: String,
    pub url: String,
    pub visited_at: DateTime<Utc>,
}

#[derive(Default)]
pub struct BrowserHistoryService {
    entries: Vec<BrowserHistoryEntry>,
}

impl BrowserHistoryService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record(&mut self, title: impl Into<String>, url: impl Into<String>) {
        self.entries.push(BrowserHistoryEntry {
            id: new_entity_uuid(),
            title: title.into(),
            url: url.into(),
            visited_at: Utc::now(),
        });
    }

    pub fn search(&self, query: &str) -> Vec<&BrowserHistoryEntry> {
        self.entries
            .iter()
            .filter(|e| {
                text_matches_query(query, &e.title) || text_matches_query(query, &e.url)
            })
            .collect()
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }

    pub fn list(&self) -> &[BrowserHistoryEntry] {
        &self.entries
    }
}
