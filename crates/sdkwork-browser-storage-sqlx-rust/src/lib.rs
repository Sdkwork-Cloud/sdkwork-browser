mod storage;

pub use storage::{storage_kind_label, BrowserStorageKind, BROWSER_STORAGE_KINDS};

pub const BROWSER_STORAGE_MIGRATION: &str = "0001_browser_storage.sql";

const BROWSER_INITIAL_MIGRATION_SQL: &str =
    include_str!("../migrations/0001_browser_storage.sql");

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BrowserRepositoryBinding {
    pub domain: &'static str,
    pub repository_name: &'static str,
    pub tables: Vec<&'static str>,
    pub requires_transaction: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BrowserStorageCapabilityManifest {
    pub name: &'static str,
    pub schema_version: &'static str,
    pub tables: Vec<&'static str>,
    pub persistence_tables: Vec<&'static str>,
    pub operational_tables: Vec<&'static str>,
    pub postgresql_extensions: Vec<&'static str>,
    pub optional_postgresql_extensions: Vec<&'static str>,
    pub migrations: Vec<&'static str>,
    pub repository_bindings: Vec<BrowserRepositoryBinding>,
}

pub fn browser_persistence_tables() -> Vec<&'static str> {
    vec![
        "browser_bookmark",
        "browser_history",
        "browser_session",
        "browser_tab",
        "browser_download",
    ]
}

pub fn browser_operational_tables() -> Vec<&'static str> {
    vec![]
}

pub fn browser_database_tables() -> Vec<&'static str> {
    browser_persistence_tables()
}

pub fn browser_initial_migration_sql() -> &'static str {
    BROWSER_INITIAL_MIGRATION_SQL
}

pub fn browser_storage_capability_manifest() -> BrowserStorageCapabilityManifest {
    let persistence_tables = browser_persistence_tables();
    BrowserStorageCapabilityManifest {
        name: "browser-storage",
        schema_version: "2026-06-19",
        tables: browser_database_tables(),
        persistence_tables: persistence_tables.clone(),
        operational_tables: browser_operational_tables(),
        postgresql_extensions: vec![],
        optional_postgresql_extensions: vec![],
        migrations: vec![BROWSER_STORAGE_MIGRATION],
        repository_bindings: vec![
            BrowserRepositoryBinding {
                domain: "browser",
                repository_name: "BrowserBookmarkRepository",
                tables: vec!["browser_bookmark"],
                requires_transaction: true,
            },
            BrowserRepositoryBinding {
                domain: "browser",
                repository_name: "BrowserHistoryRepository",
                tables: vec!["browser_history"],
                requires_transaction: true,
            },
            BrowserRepositoryBinding {
                domain: "browser",
                repository_name: "BrowserSessionRepository",
                tables: vec!["browser_session"],
                requires_transaction: true,
            },
            BrowserRepositoryBinding {
                domain: "browser",
                repository_name: "BrowserTabRepository",
                tables: vec!["browser_tab"],
                requires_transaction: true,
            },
            BrowserRepositoryBinding {
                domain: "browser",
                repository_name: "BrowserDownloadRepository",
                tables: vec!["browser_download"],
                requires_transaction: true,
            },
        ],
    }
}

pub const BROWSER_STORAGE_SCHEMA_VERSION: i64 = 1;

pub fn browser_storage_schema_version() -> i64 {
    BROWSER_STORAGE_SCHEMA_VERSION
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tracks_storage_schema_version() {
        assert_eq!(browser_storage_schema_version(), 1);
    }

    #[test]
    fn exposes_web_storage_kinds() {
        assert_eq!(BROWSER_STORAGE_KINDS.len(), 4);
    }
}
