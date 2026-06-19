use sdkwork_browser_shared_service::new_entity_uuid;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DownloadState {
    Queued,
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserDownload {
    pub id: Uuid,
    pub url: String,
    pub file_name: String,
    pub state: DownloadState,
}

#[derive(Default)]
pub struct BrowserDownloadService {
    items: Vec<BrowserDownload>,
}

impl BrowserDownloadService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn enqueue(&mut self, url: impl Into<String>, file_name: impl Into<String>) -> &BrowserDownload {
        let item = BrowserDownload {
            id: new_entity_uuid(),
            url: url.into(),
            file_name: file_name.into(),
            state: DownloadState::Queued,
        };
        self.items.push(item);
        self.items.last().expect("download pushed")
    }

    pub fn pause(&mut self, id: Uuid) -> bool {
        self.set_state(id, DownloadState::Paused)
    }

    pub fn resume(&mut self, id: Uuid) -> bool {
        self.set_state(id, DownloadState::Active)
    }

    pub fn cancel(&mut self, id: Uuid) -> bool {
        self.set_state(id, DownloadState::Cancelled)
    }

    fn set_state(&mut self, id: Uuid, state: DownloadState) -> bool {
        if let Some(item) = self.items.iter_mut().find(|d| d.id == id) {
            item.state = state;
            return true;
        }
        false
    }

    pub fn list(&self) -> &[BrowserDownload] {
        &self.items
    }
}
