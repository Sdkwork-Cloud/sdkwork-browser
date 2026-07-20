//! Gateway bootstrap for sdkwork-browser.
//! Route crates are composed here; gateway hosts depend on this crate only.

use axum::Router;
use sdkwork_browser_platform_service::BrowserPlatform;
use sdkwork_routes_browser_support::BrowserGatewayState;

pub struct ApiAssembly {
    pub router: Router,
}

pub fn assemble_api_router() -> anyhow::Result<ApiAssembly> {
    let platform = BrowserPlatform::with_default_config()?;
    let state = BrowserGatewayState::new(platform);
    let router = Router::new()
        .merge(sdkwork_routes_browser_app_api::gateway_mount(state.clone()))
        .merge(sdkwork_routes_browser_backend_api::gateway_mount(state));
    Ok(ApiAssembly { router })
}
