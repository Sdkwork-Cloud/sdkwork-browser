//! Gateway bootstrap for sdkwork-browser.
//! Route crates are composed here; gateway hosts depend on this crate only.

use axum::Router;

pub struct ApplicationAssembly {
    pub router: Router,
}

pub fn assemble_application_router() -> anyhow::Result<ApplicationAssembly> {
    let router = Router::new()
        .merge(sdkwork_routes_browser_app_api::gateway_mount())
        .merge(sdkwork_routes_browser_backend_api::gateway_mount());
    Ok(ApplicationAssembly { router })
}
