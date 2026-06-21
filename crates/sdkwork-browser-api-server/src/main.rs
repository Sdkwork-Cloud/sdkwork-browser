mod gateway_manifest;

use gateway_manifest::wrap_gateway_router_with_web_framework_from_env;
use sdkwork_browser_service_host::BrowserRuntimeFactory;
use sdkwork_router_browser_app_api::{mount_browser_app_api, BrowserAppState};
use sdkwork_router_browser_backend_api::mount_browser_backend_api;
use sdkwork_web_bootstrap::{service_router, ServiceRouterConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let bind = std::env::var("BROWSER_APP_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let platform = BrowserRuntimeFactory::create_webview_platform()?;
    let state = BrowserAppState::new(platform);

    let router = mount_browser_backend_api(
        mount_browser_app_api(axum::Router::new(), state.clone()),
        state,
    );
    let router = wrap_gateway_router_with_web_framework_from_env(router).await;
    let router = service_router(router, ServiceRouterConfig::default().with_always_ready());

    let listener = tokio::net::TcpListener::bind(&bind).await?;
    tracing::info!(%bind, "sdkwork-browser api-server listening (app-api + backend-api)");
    axum::serve(listener, router).await?;
    Ok(())
}
