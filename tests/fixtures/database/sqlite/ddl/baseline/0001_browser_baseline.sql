-- SDKWork browser consolidated initialization baseline (sqlite)
-- SQLite-native types; session table must be created before dependent tables.

CREATE TABLE IF NOT EXISTS browser_session (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    account_label TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'persistent',
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER
);

CREATE TABLE IF NOT EXISTS browser_bookmark (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    session_uuid TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    folder TEXT NOT NULL DEFAULT 'default',
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    FOREIGN KEY (session_uuid) REFERENCES browser_session(uuid)
);

CREATE TABLE IF NOT EXISTS browser_history (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    session_uuid TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    visited_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    FOREIGN KEY (session_uuid) REFERENCES browser_session(uuid)
);

CREATE TABLE IF NOT EXISTS browser_tab (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    session_uuid TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    pin_state TEXT NOT NULL DEFAULT 'unpinned',
    group_id TEXT,
    closed INTEGER NOT NULL DEFAULT 0,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    FOREIGN KEY (session_uuid) REFERENCES browser_session(uuid)
);

CREATE TABLE IF NOT EXISTS browser_download (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    session_uuid TEXT NOT NULL,
    file_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    FOREIGN KEY (session_uuid) REFERENCES browser_session(uuid)
);

CREATE INDEX IF NOT EXISTS idx_browser_session_account_kind
    ON browser_session (account_label, kind, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_browser_bookmark_session_folder
    ON browser_bookmark (session_uuid, folder, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_browser_history_session_visited
    ON browser_history (session_uuid, visited_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_browser_tab_session_closed
    ON browser_tab (session_uuid, closed, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_browser_download_session_status
    ON browser_download (session_uuid, status, updated_at DESC)
    WHERE deleted_at IS NULL;
