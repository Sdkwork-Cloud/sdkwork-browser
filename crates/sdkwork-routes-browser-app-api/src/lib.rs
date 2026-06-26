pub mod http_route_manifest;
pub mod manifest;
pub mod web_bootstrap;

pub use http_route_manifest::app_route_manifest;
pub use manifest::{
    app_routes, required_dual_token_headers, BrowserHttpRoute, HttpMethod, APP_API_PREFIX,
    BROWSER_APP_API_AUTHORITY, BROWSER_APP_API_AUTH_MODE, BROWSER_APP_SDK_FAMILY,
    ROUTE_CRATE_PACKAGE,
};
pub use web_bootstrap::{
    browser_app_api_prefixes, browser_app_api_public_path_prefixes, wrap_router_with_web_framework,
    wrap_router_with_web_framework_from_env,
};

pub fn gateway_route_manifest() -> HttpRouteManifest {
    app_route_manifest()
}

pub fn gateway_mount() -> axum::Router {
    axum::Router::new()
}
