use axum::routing::post;
use axum::Router;

use crate::handlers;
use crate::state::BrowserAppState;
use sdkwork_routes_browser_app_api::APP_API_PREFIX;

pub fn build_app_router(state: BrowserAppState) -> Router {
    Router::new()
        .route(
            &format!("{APP_API_PREFIX}/browser/ai/actions"),
            post(handlers::ai_actions_create),
        )
        .route(
            &format!("{APP_API_PREFIX}/browser/sessions"),
            post(handlers::sessions_create),
        )
        .route(
            &format!("{APP_API_PREFIX}/browser/tabs"),
            post(handlers::tabs_create),
        )
        .with_state(state)
}

pub fn mount_browser_app_api(router: Router, state: BrowserAppState) -> Router {
    router.merge(build_app_router(state))
}
