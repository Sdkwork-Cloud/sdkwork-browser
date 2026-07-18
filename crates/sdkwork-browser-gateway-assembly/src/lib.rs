//! Gateway assembly for sdkwork-browser.
//! Application bootstrap lives in `bootstrap.rs`; route inventory is in `assembly-manifest.json`.

mod bootstrap;
mod generated;

pub use bootstrap::{assemble_application_router, ApplicationAssembly};
pub use sdkwork_routes_browser_app_api::APP_API_PREFIX;
pub use sdkwork_routes_browser_backend_api::BACKEND_API_PREFIX;

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}
