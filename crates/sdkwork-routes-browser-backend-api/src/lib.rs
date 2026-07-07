pub mod http_route_manifest;
pub mod manifest;
pub mod paths;
pub mod routes;
pub mod web_bootstrap;

use axum::Router;
use sdkwork_routes_browser_support::BrowserGatewayState;
use sdkwork_web_core::HttpRouteManifest;

pub use http_route_manifest::backend_route_manifest;
pub use manifest::{
    backend_routes, browser_backend_api_route_count, required_dual_token_headers,
    BrowserHttpRoute, HttpMethod, BACKEND_API_PREFIX, BROWSER_BACKEND_API_AUTHORITY,
    BROWSER_BACKEND_API_AUTH_MODE, BROWSER_BACKEND_SDK_FAMILY, ROUTE_CRATE_PACKAGE,
};
pub use web_bootstrap::{
    browser_backend_api_prefixes, browser_backend_api_public_path_prefixes,
    wrap_router_with_web_framework, wrap_router_with_web_framework_from_env,
};

pub fn gateway_route_manifest() -> HttpRouteManifest {
    backend_route_manifest()
}

pub fn gateway_mount(state: BrowserGatewayState) -> Router {
    routes::build_router(state)
}
