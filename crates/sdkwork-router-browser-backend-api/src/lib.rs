mod handlers;
mod routes;

pub use routes::{build_backend_router, mount_browser_backend_api};
pub use sdkwork_router_browser_app_api::{BrowserApiResult, BrowserAppState};
