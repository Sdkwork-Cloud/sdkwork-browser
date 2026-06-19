use axum::routing::get;
use axum::Router;

use crate::handlers;
use sdkwork_router_browser_app_api::BrowserAppState;
use sdkwork_routes_browser_backend_api::BACKEND_API_PREFIX;

pub fn build_backend_router(state: BrowserAppState) -> Router {
    Router::new()
        .route(
            &format!("{BACKEND_API_PREFIX}/browser/sessions"),
            get(handlers::sessions_list),
        )
        .route(
            &format!("{BACKEND_API_PREFIX}/browser/engines"),
            get(handlers::engines_list),
        )
        .with_state(state)
}

pub fn mount_browser_backend_api(router: Router, state: BrowserAppState) -> Router {
    router.merge(build_backend_router(state))
}
