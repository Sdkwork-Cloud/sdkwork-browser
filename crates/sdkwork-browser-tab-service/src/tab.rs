use sdkwork_browser_shared_service::new_entity_uuid;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TabPinState {
    Unpinned,
    Pinned,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserTab {
    pub id: Uuid,
    pub title: String,
    pub url: String,
    pub pin_state: TabPinState,
    pub group_id: Option<String>,
    pub closed: bool,
}

#[derive(Default)]
pub struct BrowserTabService {
    tabs: Vec<BrowserTab>,
    closed_tabs: Vec<BrowserTab>,
}

impl BrowserTabService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn open(&mut self, title: impl Into<String>, url: impl Into<String>) -> &BrowserTab {
        let tab = BrowserTab {
            id: new_entity_uuid(),
            title: title.into(),
            url: url.into(),
            pin_state: TabPinState::Unpinned,
            group_id: None,
            closed: false,
        };
        self.tabs.push(tab);
        self.tabs.last().expect("tab just pushed")
    }

    pub fn close(&mut self, tab_id: Uuid) -> bool {
        if let Some(index) = self.tabs.iter().position(|t| t.id == tab_id) {
            let mut tab = self.tabs.remove(index);
            tab.closed = true;
            self.closed_tabs.push(tab);
            return true;
        }
        false
    }

    pub fn restore_last_closed(&mut self) -> Option<&BrowserTab> {
        let mut tab = self.closed_tabs.pop()?;
        tab.closed = false;
        self.tabs.push(tab);
        self.tabs.last()
    }

    pub fn pin(&mut self, tab_id: Uuid) -> bool {
        if let Some(tab) = self.tabs.iter_mut().find(|t| t.id == tab_id) {
            tab.pin_state = TabPinState::Pinned;
            return true;
        }
        false
    }

    pub fn set_group(&mut self, tab_id: Uuid, group_id: impl Into<String>) -> bool {
        if let Some(tab) = self.tabs.iter_mut().find(|t| t.id == tab_id) {
            tab.group_id = Some(group_id.into());
            return true;
        }
        false
    }

    pub fn set_url(
        &mut self,
        tab_id: Uuid,
        title: impl Into<String>,
        url: impl Into<String>,
    ) -> bool {
        if let Some(tab) = self.tabs.iter_mut().find(|t| t.id == tab_id) {
            tab.title = title.into();
            tab.url = url.into();
            return true;
        }
        false
    }

    pub fn list(&self) -> &[BrowserTab] {
        &self.tabs
    }

    pub fn list_closed(&self) -> &[BrowserTab] {
        &self.closed_tabs
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_url_updates_existing_tab() {
        let mut service = BrowserTabService::new();
        let tab = service.open("A", "https://a.local").clone();
        assert!(service.set_url(tab.id, "B", "https://b.local"));
        assert_eq!(service.list()[0].url, "https://b.local");
        assert_eq!(service.list()[0].title, "B");
    }

    #[test]
    fn supports_pin_group_restore() {
        let mut service = BrowserTabService::new();
        let tab = service.open("A", "https://a.local").clone();
        service.pin(tab.id);
        service.set_group(tab.id, "work");
        assert!(service.close(tab.id));
        assert_eq!(service.list().len(), 0);
        service.restore_last_closed();
        assert_eq!(service.list().len(), 1);
        assert_eq!(service.list()[0].pin_state, TabPinState::Pinned);
    }
}
