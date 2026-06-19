use axum::Router;
use sdkwork_iam_web_adapter::IamDatabaseWebRequestContextResolver;
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::WebRequestContextProfile;

use crate::http_route_manifest::backend_route_manifest;
use crate::manifest::BACKEND_API_PREFIX;

pub fn browser_backend_api_public_path_prefixes() -> Vec<String> {
    vec!["/healthz".to_owned()]
}

pub fn browser_backend_api_prefixes() -> Vec<String> {
    vec![BACKEND_API_PREFIX.to_owned()]
}

pub fn wrap_router_with_web_framework(
    resolver: IamDatabaseWebRequestContextResolver,
    router: Router,
) -> Router {
    let route_manifest = backend_route_manifest();
    route_manifest
        .validate_public_path_prefixes(&browser_backend_api_public_path_prefixes())
        .expect("browser backend-api public prefixes must not cover protected manifest routes");

    let layer = WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            open_api_prefixes: browser_backend_api_prefixes(),
            public_path_prefixes: browser_backend_api_public_path_prefixes(),
            ..WebRequestContextProfile::default()
        })
        .with_route_manifest(route_manifest);
    with_web_request_context(router, layer)
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_database_resolver_from_env().await;
    wrap_router_with_web_framework(resolver, router)
}
