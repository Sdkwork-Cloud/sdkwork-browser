use axum::{
    extract::Query,
    routing::get,
    Extension, Router,
};
use sdkwork_routes_browser_support::{
    success_page_response, success_resource_response, BrowserGatewayState, BrowserListQuery,
};

use crate::paths;

pub fn build_router(state: BrowserGatewayState) -> Router {
    Router::new()
        .route(paths::SESSIONS, get(list_sessions))
        .route(paths::ENGINES, get(list_engines))
        .route(paths::AGENT_DIAGNOSTICS, get(agent_diagnostics))
        .layer(Extension(state))
}

async fn list_sessions(
    Extension(state): Extension<BrowserGatewayState>,
    Query(query): Query<BrowserListQuery>,
) -> Result<axum::response::Response, sdkwork_routes_browser_support::BrowserApiProblem> {
    let params = query.offset_params()?;
    let platform = state.platform();
    let page = {
        let guard = platform.lock().await;
        guard.list_operator_sessions_page(params)
    };
    Ok(success_page_response(page))
}

async fn list_engines(
    Extension(state): Extension<BrowserGatewayState>,
    Query(query): Query<BrowserListQuery>,
) -> Result<axum::response::Response, sdkwork_routes_browser_support::BrowserApiProblem> {
    let params = query.offset_params()?;
    let platform = state.platform();
    let page = {
        let guard = platform.lock().await;
        guard.list_operator_engines_page(params)
    };
    Ok(success_page_response(page))
}

async fn agent_diagnostics(
    Extension(state): Extension<BrowserGatewayState>,
) -> Result<axum::response::Response, sdkwork_routes_browser_support::BrowserApiProblem> {
    let platform = state.platform();
    let diagnostics = {
        let guard = platform.lock().await;
        guard.agent_runtime_diagnostics()
    };
    Ok(success_resource_response(diagnostics))
}
