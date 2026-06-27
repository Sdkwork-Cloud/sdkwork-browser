mod gateway_manifest;

use gateway_manifest::wrap_gateway_router_with_web_framework_from_env;
use sdkwork_browser_gateway_assembly::assemble_application_router;
use sdkwork_web_bootstrap::{service_router, ServiceRouterConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let bind = std::env::var("BROWSER_APP_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let assembly = assemble_application_router()?;
    let router = wrap_gateway_router_with_web_framework_from_env(assembly.router).await;
    let router = service_router(router, ServiceRouterConfig::default().with_always_ready());

    let listener = tokio::net::TcpListener::bind(&bind).await?;
    tracing::info!(%bind, "sdkwork-browser standalone-gateway listening (app-api + backend-api)");
    axum::serve(listener, router).await?;
    Ok(())
}
