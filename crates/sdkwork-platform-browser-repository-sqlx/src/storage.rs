//! Web storage surface types (PRD §9 Browser Storage).

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrowserStorageKind {
    LocalStorage,
    SessionStorage,
    IndexedDb,
    CacheStorage,
}

pub const BROWSER_STORAGE_KINDS: [BrowserStorageKind; 4] = [
    BrowserStorageKind::LocalStorage,
    BrowserStorageKind::SessionStorage,
    BrowserStorageKind::IndexedDb,
    BrowserStorageKind::CacheStorage,
];

pub fn storage_kind_label(kind: BrowserStorageKind) -> &'static str {
    match kind {
        BrowserStorageKind::LocalStorage => "localStorage",
        BrowserStorageKind::SessionStorage => "sessionStorage",
        BrowserStorageKind::IndexedDb => "indexedDB",
        BrowserStorageKind::CacheStorage => "cacheStorage",
    }
}
