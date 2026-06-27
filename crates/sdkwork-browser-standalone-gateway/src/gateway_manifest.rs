use axum::Router;
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_browser_gateway_assembly::{APP_API_PREFIX, BACKEND_API_PREFIX};
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest, WebRequestContextProfile};

const GATEWAY_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/browser/sessions",
        "browser",
        "browser.sessions.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/browser/tabs",
        "browser",
        "browser.tabs.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/browser/ai/actions",
        "browser",
        "browser.aiActions.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/browser/sessions",
        "browser",
        "browser.sessions.list",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/browser/engines",
        "browser",
        "browser.engines.list",
    ),
];

pub fn browser_gateway_public_path_prefixes() -> Vec<String> {
    vec!["/healthz".to_owned()]
}

pub fn browser_gateway_api_prefixes() -> Vec<String> {
    vec![
        APP_API_PREFIX.to_owned(),
        BACKEND_API_PREFIX.to_owned(),
    ]
}

pub fn wrap_gateway_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    let route_manifest = HttpRouteManifest::new(GATEWAY_ROUTES);
    route_manifest
        .validate_public_path_prefixes(&browser_gateway_public_path_prefixes())
        .expect("browser gateway public prefixes must not cover protected manifest routes");

    let layer = WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            open_api_prefixes: browser_gateway_api_prefixes(),
            public_path_prefixes: browser_gateway_public_path_prefixes(),
            ..WebRequestContextProfile::default()
        })
        .with_route_manifest(route_manifest);
    with_web_request_context(router, layer)
}

pub async fn wrap_gateway_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    wrap_gateway_router_with_web_framework(resolver, router)
}
