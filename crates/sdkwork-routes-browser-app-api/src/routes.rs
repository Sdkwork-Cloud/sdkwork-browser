use axum::{
    routing::post,
    Extension, Json, Router,
};
use sdkwork_browser_agent_service::{BrowserAiActionRequest, BrowserAiActionResult};
use sdkwork_browser_platform_service::{BrowserPlatformSnapshot, PlatformError};
use sdkwork_routes_browser_support::{
    created_resource_json, ok_resource_json, success_resource_response, BrowserGatewayState,
};
use serde::Deserialize;
use serde_json::Value;

use crate::paths;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrowserOperationCommand {
    #[serde(default)]
    action: String,
    #[serde(default)]
    target_url: Option<String>,
    #[serde(default)]
    tab_id: Option<String>,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    engine_id: Option<String>,
    #[serde(default)]
    connector_id: Option<String>,
    #[serde(default)]
    tool_name: Option<String>,
    #[serde(default)]
    arguments: Option<Value>,
    #[serde(flatten)]
    extra: Value,
}

pub fn build_router(state: BrowserGatewayState) -> Router {
    Router::new()
        .route(paths::SESSIONS, post(create_session))
        .route(paths::TABS, post(create_tab))
        .route(paths::AI_ACTIONS, post(create_ai_action))
        .layer(Extension(state))
}

async fn create_session(
    Extension(state): Extension<BrowserGatewayState>,
    Json(command): Json<BrowserOperationCommand>,
) -> Result<axum::response::Response, sdkwork_routes_browser_support::BrowserApiProblem> {
    let platform = state.platform();
    let mut guard = platform.lock().await;
    let normalized = command.action.to_ascii_lowercase();
    match normalized.as_str() {
        "bootstrap" | "start" | "init" => {
            if let Some(engine_id) = command.engine_id.as_deref() {
                guard.switch_engine(engine_id).await?;
            } else if guard.active_engine_id().is_none() {
                guard.start_engine().await?;
            }
            if let Some(url) = command.target_url.as_deref() {
                guard.load_url(url).await?;
            }
            let snapshot = guard.snapshot();
            created_resource_json::<BrowserPlatformSnapshot, PlatformError>(Ok(snapshot))
        }
        _ => Err(PlatformError::InvalidEngine(format!(
            "unsupported session action: {}",
            command.action
        ))
        .into()),
    }
}

async fn create_tab(
    Extension(state): Extension<BrowserGatewayState>,
    Json(command): Json<BrowserOperationCommand>,
) -> Result<axum::response::Response, sdkwork_routes_browser_support::BrowserApiProblem> {
    let platform = state.platform();
    let mut guard = platform.lock().await;
    if guard.active_engine_id().is_none() {
        guard.start_engine().await?;
    }
    let normalized = command.action.to_ascii_lowercase();
    match normalized.as_str() {
        "navigate" | "open" | "goto" => {
            let url = command
                .target_url
                .as_deref()
                .ok_or_else(|| PlatformError::InvalidEngine("targetUrl is required".into()))?;
            guard.load_url(url).await?;
            created_resource_json::<BrowserPlatformSnapshot, PlatformError>(Ok(guard.snapshot()))
        }
        "opennew" | "open-new" | "new" => {
            let url = command
                .target_url
                .as_deref()
                .ok_or_else(|| PlatformError::InvalidEngine("targetUrl is required".into()))?;
            guard.open_url_in_new_tab(url).await?;
            created_resource_json::<BrowserPlatformSnapshot, PlatformError>(Ok(guard.snapshot()))
        }
        _ => Err(PlatformError::InvalidEngine(format!(
            "unsupported tab action: {}",
            command.action
        ))
        .into()),
    }
}

async fn create_ai_action(
    Extension(state): Extension<BrowserGatewayState>,
    Json(command): Json<BrowserOperationCommand>,
) -> Result<axum::response::Response, sdkwork_routes_browser_support::BrowserApiProblem> {
    let platform = state.platform();
    let normalized = command.action.to_ascii_lowercase().replace('-', "");
    if normalized == "mcplisttools" {
        let tools = {
            let guard = platform.lock().await;
            guard.list_mcp_tools()
        };
        return Ok(success_resource_response(serde_json::json!({ "tools": tools })));
    }
    if normalized == "mcpinvoke" {
        let request = sdkwork_browser_mcp_service::McpToolInvokeRequest {
            connector_id: command.connector_id.unwrap_or_default(),
            tool_name: command.tool_name.unwrap_or_default(),
            arguments: command.arguments.unwrap_or_else(|| Value::Object(Default::default())),
        };
        let result = {
            let guard = platform.lock().await;
            guard.invoke_mcp_tool(request)
        };
        return Ok(success_resource_response(result));
    }

    let mut guard = platform.lock().await;
    if guard.active_engine_id().is_none() {
        guard.start_engine().await?;
    }
    let result = guard
        .execute_ai_action(BrowserAiActionRequest {
            action: command.action,
            target_url: command.target_url,
            tab_id: command.tab_id,
            message: command.message,
            engine_id: command.engine_id,
        })
        .await?;
    ok_resource_json::<BrowserAiActionResult, PlatformError>(Ok(result))
}
