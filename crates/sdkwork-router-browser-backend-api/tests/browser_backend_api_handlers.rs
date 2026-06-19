use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_browser_service_host::BrowserRuntimeFactory;
use sdkwork_iam_web_adapter::IamDatabaseWebRequestContextResolver;
use sdkwork_routes_browser_backend_api::wrap_router_with_web_framework;
use sdkwork_router_browser_backend_api::{build_backend_router, BrowserAppState};
use tower::ServiceExt;

const DEV_AUTH_TOKEN: &str = "tenant_id=sdkwork;user_id=browser;session_id=local;app_id=sdkwork-browser;auth_level=password";
const DEV_ACCESS_TOKEN: &str = "tenant_id=sdkwork;user_id=browser;session_id=local;app_id=sdkwork-browser;environment=dev;deployment_mode=local";

async fn read_body(response: axum::response::Response) -> String {
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body")
        .to_bytes();
    String::from_utf8(bytes.to_vec()).expect("utf8")
}

#[tokio::test]
async fn sessions_list_returns_local_session() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_backend_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/browser/sessions")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = read_body(response).await;
    assert!(body.contains("local"));
    assert!(body.contains("agentDiagnostics"));
    assert!(body.contains("agent_runtime_diagnostics.v1"));
    assert!(body.contains("runtimeMode"));
}

#[tokio::test]
async fn engines_list_returns_registered_engines() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_backend_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/browser/engines")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = read_body(response).await;
    assert!(body.contains("webview"));
    assert!(body.contains("cef"));
}

#[tokio::test]
async fn backend_routes_require_dual_token_when_wrapped() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_backend_router(state);
    let resolver = IamDatabaseWebRequestContextResolver::new(None);
    let router = wrap_router_with_web_framework(resolver, router);

    let authed = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/browser/engines")
                .header("Authorization", format!("Bearer {DEV_AUTH_TOKEN}"))
                .header("Access-Token", DEV_ACCESS_TOKEN)
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(authed.status(), StatusCode::OK);

    let missing_auth = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/browser/engines")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(missing_auth.status(), StatusCode::UNAUTHORIZED);
}
