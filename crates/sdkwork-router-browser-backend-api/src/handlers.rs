use axum::extract::State;
use serde_json::json;

use sdkwork_router_browser_app_api::{ok_json, BrowserApiResult, BrowserAppState, HandlerResult};

pub async fn sessions_list(State(state): State<BrowserAppState>) -> HandlerResult {
    let platform = state.platform.lock().await;
    let sessions = platform.list_operator_sessions();
    let diagnostics = platform.agent_runtime_diagnostics();
    ok_json(BrowserApiResult::ok(
        format!("{} browser sessions available.", sessions.len()),
        json!({
            "sessions": sessions,
            "agentDiagnostics": diagnostics,
        }),
    ))
}

pub async fn engines_list(State(state): State<BrowserAppState>) -> HandlerResult {
    let platform = state.platform.lock().await;
    let engines = platform.list_operator_engines();
    ok_json(BrowserApiResult::ok(
        format!("{} browser engines registered.", engines.len()),
        json!({ "engines": engines }),
    ))
}
