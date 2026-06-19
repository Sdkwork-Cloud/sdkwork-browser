use axum::extract::State;
use axum::Json;
use serde_json::json;
use sdkwork_browser_agent_service::BrowserAgentChatRequest;
use sdkwork_browser_platform_service::McpToolInvokeRequest;

use crate::dto::BrowserOperationCommand;
use crate::response::{ok_json, ok_sse, snapshot_data, ApiProblem, BrowserApiResult, HandlerResult};
use crate::state::BrowserAppState;

pub async fn ai_actions_create(
    State(state): State<BrowserAppState>,
    Json(body): Json<BrowserOperationCommand>,
) -> HandlerResult {
    let action = body.action.to_ascii_lowercase();
    let mut platform = state.platform.lock().await;
    ensure_engine_started(&mut platform).await?;

    if action == "chatstream" {
        let stream = platform
            .agent_chat_stream(BrowserAgentChatRequest {
                message: body.message.unwrap_or_default(),
                tab_id: body.tab_id,
            })
            .await
            .map_err(ApiProblem::from_platform)?;
        if body.stream.unwrap_or(false) {
            return ok_sse(
                stream.chunks,
                stream.reply.content.clone(),
                stream.reply.action.as_deref(),
            );
        }
        return ok_json(BrowserApiResult::ok(
            stream.reply.content.clone(),
            json!({
                "chunks": stream.chunks,
                "reply": stream.reply,
                "suggestedActions": stream.suggested_actions,
            }),
        ));
    }

    if action == "mcplisttools" {
        let tools = platform.list_mcp_tools();
        return ok_json(BrowserApiResult::ok(
            format!("{} MCP tools available.", tools.len()),
            json!({ "tools": tools }),
        ));
    }

    if action == "mcpinvoke" {
        let result = platform.invoke_mcp_tool(McpToolInvokeRequest {
            connector_id: body.connector_id.unwrap_or_default(),
            tool_name: body.tool_name.unwrap_or_default(),
            arguments: body.arguments.unwrap_or_else(|| json!({})),
        });
        return ok_json(BrowserApiResult {
            code: result.code,
            message: result.message,
            request_id: uuid::Uuid::new_v4().to_string(),
            data: result.data,
        });
    }

    let request = body.into_ai_request();
    let result = platform
        .execute_ai_action(request)
        .await
        .map_err(ApiProblem::from_platform)?;
    ok_json(BrowserApiResult::from_action(result))
}

pub async fn sessions_create(
    State(state): State<BrowserAppState>,
    Json(body): Json<BrowserOperationCommand>,
) -> HandlerResult {
    let mut platform = state.platform.lock().await;
    ensure_engine_started(&mut platform).await?;
    if let Some(url) = body.target_url.as_deref() {
        platform
            .load_url(url)
            .await
            .map_err(ApiProblem::from_platform)?;
    }
    let snapshot = platform.snapshot();
    ok_json(BrowserApiResult::ok(
        "browser session ready",
        snapshot_data(&snapshot),
    ))
}

pub async fn tabs_create(
    State(state): State<BrowserAppState>,
    Json(body): Json<BrowserOperationCommand>,
) -> HandlerResult {
    let request = body.into_ai_request();
    let mut platform = state.platform.lock().await;
    ensure_engine_started(&mut platform).await?;

    if let Some(url) = request.target_url.as_deref() {
        platform
            .load_url(url)
            .await
            .map_err(ApiProblem::from_platform)?;
    } else if request.action.eq_ignore_ascii_case("navigate") {
        return Err(ApiProblem::bad_request(
            "tabs.create navigate requires targetUrl",
        ));
    }

    let snapshot = platform.snapshot();
    ok_json(BrowserApiResult::ok(
        "browser tab updated",
        snapshot_data(&snapshot),
    ))
}

async fn ensure_engine_started(
    platform: &mut sdkwork_browser_platform_service::BrowserPlatform,
) -> Result<(), ApiProblem> {
    if platform.active_engine_id().is_none() {
        platform
            .start_engine()
            .await
            .map_err(ApiProblem::from_platform)?;
    }
    Ok(())
}
