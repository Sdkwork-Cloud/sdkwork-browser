use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_browser_service_host::BrowserRuntimeFactory;
use sdkwork_iam_web_adapter::IamDatabaseWebRequestContextResolver;
use sdkwork_routes_browser_app_api::wrap_router_with_web_framework;
use sdkwork_router_browser_app_api::{build_app_router, BrowserAppState};
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
async fn ai_actions_create_returns_browser_api_result() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_app_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/ai/actions")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"action":"summarize"}"#))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn ai_actions_create_requires_dual_token_when_wrapped() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_app_router(state);
    let resolver = IamDatabaseWebRequestContextResolver::new(None);
    let router = wrap_router_with_web_framework(resolver, router);

    let authed = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/ai/actions")
                .header("content-type", "application/json")
                .header("Authorization", format!("Bearer {DEV_AUTH_TOKEN}"))
                .header("Access-Token", DEV_ACCESS_TOKEN)
                .body(Body::from(r#"{"action":"summarize"}"#))
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(authed.status(), StatusCode::OK);

    let missing_auth = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/ai/actions")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"action":"summarize"}"#))
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(missing_auth.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn ai_actions_chat_stream_returns_sse_when_requested() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_app_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/ai/actions")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"action":"chatStream","message":"hello browser","stream":true}"#,
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = read_body(response).await;
    assert!(body.contains("data:"));
    assert!(body.contains("event: done"));
}

#[tokio::test]
async fn ai_actions_chat_stream_emits_meta_for_group_tabs() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_app_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/ai/actions")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"action":"chatStream","message":"please group my tabs","stream":true}"#,
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = read_body(response).await;
    assert!(body.contains("event: meta"));
    assert!(body.contains("groupTabs"));
}

#[tokio::test]
async fn ai_actions_mcp_list_tools_returns_tool_catalog() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_app_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/ai/actions")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"action":"mcpListTools"}"#))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = read_body(response).await;
    assert!(body.contains("search_repositories"));
}

#[tokio::test]
async fn ai_actions_mcp_invoke_returns_stub_result() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_app_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/ai/actions")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"action":"mcpInvoke","connectorId":"github","toolName":"search_repositories","arguments":{"query":"sdkwork"}}"#,
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = read_body(response).await;
    assert!(body.contains("sdkwork"));
}

#[tokio::test]
async fn sessions_create_returns_tabs_in_snapshot_data() {
    let platform = BrowserRuntimeFactory::create_webview_platform().expect("platform");
    let state = BrowserAppState::new(platform);
    let router = build_app_router(state);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/browser/sessions")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"action":"bootstrap"}"#))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::OK);
    let body = read_body(response).await;
    assert!(body.contains("\"tabs\""));
    assert!(body.contains("tabCount"));
}
