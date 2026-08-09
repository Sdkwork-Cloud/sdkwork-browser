//! Gateway bootstrap for sdkwork-browser.
//! Route crates are composed here; gateway hosts depend on this crate only.
//!
//! The assembly exports the indivisible `ApiAssemblyContribution` contract
//! (API_ASSEMBLY_SPEC.md section 4); the platform cloud gateway composes the
//! contribution with its process-shared PostgreSQL pool.

use std::sync::Arc;

use axum::Router;
use sdkwork_browser_platform_service::BrowserPlatform;
use sdkwork_routes_browser_support::BrowserGatewayState;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_web_bootstrap::{
    ApiAssemblyContribution, DatabasePoolReadinessCheck, ReadinessCheck,
};
use sdkwork_web_core::HttpRouteManifest;

/// Indivisible host-neutral API assembly contribution (web-bootstrap contract).
pub type ApiAssembly = ApiAssemblyContribution;

fn combined_route_manifest() -> HttpRouteManifest {
    let manifests = [
        sdkwork_routes_browser_app_api::gateway_route_manifest(),
        sdkwork_routes_browser_backend_api::gateway_route_manifest(),
    ];
    HttpRouteManifest::from_owned_routes(
        manifests
            .into_iter()
            .flat_map(|manifest| manifest.routes().to_vec())
            .collect(),
    )
}

fn contribution_from(
    router: Router,
    readiness_check: Arc<dyn ReadinessCheck>,
) -> Result<ApiAssembly, String> {
    ApiAssemblyContribution::from_manifest(
        "sdkwork-browser",
        "SDKWork Browser API",
        router,
        combined_route_manifest(),
        Vec::new(),
        readiness_check,
    )
}

fn browser_router() -> Result<Router, String> {
    let platform = BrowserPlatform::with_default_config().map_err(|error| error.to_string())?;
    let state = BrowserGatewayState::new(platform);
    Ok(Router::new()
        .merge(sdkwork_routes_browser_app_api::gateway_mount(state.clone()))
        .merge(sdkwork_routes_browser_backend_api::gateway_mount(state)))
}

pub fn assemble_api_router() -> anyhow::Result<ApiAssembly> {
    contribution_from(
        browser_router().map_err(anyhow::Error::msg)?,
        Arc::new(sdkwork_web_bootstrap::AlwaysReady),
    )
    .map_err(anyhow::Error::msg)
}

/// Assemble the Browser contribution against a caller-provided database pool so
/// the platform cloud gateway can share its process-wide PostgreSQL pool.
pub fn assemble_api_router_with_pool(pool: DatabasePool) -> Result<ApiAssembly, String> {
    contribution_from(
        browser_router()?,
        Arc::new(DatabasePoolReadinessCheck::new(pool)),
    )
}
