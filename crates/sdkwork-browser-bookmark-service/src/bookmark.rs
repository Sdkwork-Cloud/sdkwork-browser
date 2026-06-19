//! Bookmark folders, search, import/export (PRD §9).

use sdkwork_browser_shared_service::{new_entity_uuid, text_matches_query};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserBookmark {
    pub id: Uuid,
    pub title: String,
    pub url: String,
    pub folder: String,
}

#[derive(Default)]
pub struct BrowserBookmarkService {
    items: Vec<BrowserBookmark>,
}

impl BrowserBookmarkService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add(&mut self, title: impl Into<String>, url: impl Into<String>, folder: impl Into<String>) {
        self.items.push(BrowserBookmark {
            id: new_entity_uuid(),
            title: title.into(),
            url: url.into(),
            folder: folder.into(),
        });
    }

    pub fn search(&self, query: &str) -> Vec<&BrowserBookmark> {
        self.items
            .iter()
            .filter(|b| {
                text_matches_query(query, &b.title) || text_matches_query(query, &b.url)
            })
            .collect()
    }

    pub fn export_json(&self) -> String {
        serde_json::to_string(&self.items).unwrap_or_else(|_| "[]".into())
    }

    pub fn list(&self) -> &[BrowserBookmark] {
        &self.items
    }
}
