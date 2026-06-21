//! SDKWork Browser database pool bootstrap via `sdkwork-database`.

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool, PoolError};

pub use sdkwork_browser_database_host::{
    bootstrap_browser_database, bootstrap_browser_database_from_env, BrowserDatabaseHost,
};

pub type BrowserDatabasePool = DatabasePool;

pub async fn connect_browser_database_pool_from_env() -> Result<BrowserDatabasePool, PoolError> {
    let config = DatabaseConfig::from_env("BROWSER")?;
    create_pool_from_config(config).await
}

pub async fn connect_and_bootstrap_browser_database_from_env() -> Result<BrowserDatabaseHost, String> {
    let pool = connect_browser_database_pool_from_env()
        .await
        .map_err(|error| error.to_string())?;
    bootstrap_browser_database(pool).await
}
