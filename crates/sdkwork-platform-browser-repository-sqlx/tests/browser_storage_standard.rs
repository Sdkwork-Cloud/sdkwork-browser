use sdkwork_platform_browser_repository_sqlx::{
    browser_database_tables, browser_initial_migration_sql, browser_persistence_tables,
    browser_storage_capability_manifest,
};

#[test]
fn exposes_browser_table_catalog() {
    let tables = browser_database_tables();

    for table in [
        "browser_bookmark",
        "browser_history",
        "browser_session",
        "browser_tab",
        "browser_download",
    ] {
        assert!(tables.contains(&table), "missing browser table: {table}");
    }

    for table in tables {
        assert!(
            table.starts_with("browser_"),
            "browser storage must expose only browser-prefixed tables: {table}",
        );
    }
}

#[test]
fn initial_migration_declares_browser_tables_and_indexes() {
    let sql = browser_initial_migration_sql();

    for expected in [
        "CREATE TABLE IF NOT EXISTS browser_bookmark",
        "CREATE TABLE IF NOT EXISTS browser_history",
        "CREATE TABLE IF NOT EXISTS browser_session",
        "CREATE TABLE IF NOT EXISTS browser_tab",
        "CREATE TABLE IF NOT EXISTS browser_download",
        "id BIGINT PRIMARY KEY",
        "uuid VARCHAR(64) NOT NULL UNIQUE",
        "tenant_id BIGINT NOT NULL DEFAULT 0",
        "organization_id BIGINT NOT NULL DEFAULT 0",
        "created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
        "updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
        "CREATE INDEX IF NOT EXISTS idx_browser_bookmark_session_folder",
        "CREATE INDEX IF NOT EXISTS idx_browser_history_session_visited",
        "CREATE INDEX IF NOT EXISTS idx_browser_tab_session_closed",
        "CREATE INDEX IF NOT EXISTS idx_browser_download_session_status",
    ] {
        assert!(
            sql.contains(expected),
            "browser migration must contain `{expected}`",
        );
    }
}

#[test]
fn manifest_declares_browser_storage_contract() {
    let manifest = browser_storage_capability_manifest();

    assert_eq!(manifest.name, "browser-storage");
    assert_eq!(manifest.schema_version, "2026-06-19");
    assert_eq!(manifest.tables, browser_database_tables());
    assert_eq!(manifest.persistence_tables, browser_persistence_tables());
    assert_eq!(manifest.migrations, vec!["0001_browser_storage.sql"]);
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "BrowserBookmarkRepository"));
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "BrowserSessionRepository"));
}
