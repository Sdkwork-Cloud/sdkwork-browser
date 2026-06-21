use axum::body::Body;
use axum::{
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use bytes::Bytes;
use futures::stream::{self, StreamExt};
use std::convert::Infallible;
use std::time::Duration;
use sdkwork_browser_agent_service::BrowserAiActionResult;
use sdkwork_browser_platform_service::PlatformError;
use sdkwork_browser_shared_service::new_request_id;
use serde::Serialize;
use serde_json::{json, Value};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserApiResult {
    pub code: String,
    pub message: String,
    pub request_id: String,
    pub data: Value,
}

impl BrowserApiResult {
    pub fn from_action(result: BrowserAiActionResult) -> Self {
        Self {
            code: result.code,
            message: result.message,
            request_id: new_request_id(),
            data: result.data,
        }
    }

    pub fn ok(message: impl Into<String>, data: Value) -> Self {
        Self {
            code: "OK".into(),
            message: message.into(),
            request_id: new_request_id(),
            data,
        }
    }
}

pub type HandlerResult = Result<Response, ApiProblem>;

pub fn ok_json(result: BrowserApiResult) -> HandlerResult {
    Ok(Json(result).into_response())
}

pub fn ok_sse(chunks: Vec<String>, reply_content: String, action: Option<&str>) -> HandlerResult {
    let mut events: Vec<String> = chunks
        .into_iter()
        .map(|chunk| format!("data: {chunk}\n\n"))
        .collect();
    if let Some(action) = action.filter(|value| !value.is_empty()) {
        events.push(format!(
            "event: meta\ndata: {{\"action\":\"{action}\"}}\n\n"
        ));
    }
    events.push(format!("event: done\ndata: {reply_content}\n\n"));

    let body_stream = stream::iter(events).then(|event| async move {
        tokio::time::sleep(Duration::from_millis(8)).await;
        Ok::<Bytes, Infallible>(Bytes::from(event))
    });

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/event-stream; charset=utf-8"),
            (header::CACHE_CONTROL, "no-cache"),
            (header::CONNECTION, "keep-alive"),
        ],
        Body::from_stream(body_stream),
    )
        .into_response())
}

#[derive(Debug, Serialize)]
pub struct ApiProblem {
    pub title: String,
    pub status: u16,
    pub detail: String,
}

impl ApiProblem {
    pub fn bad_request(detail: impl Into<String>) -> Self {
        Self {
            title: "Bad Request".into(),
            status: StatusCode::BAD_REQUEST.as_u16(),
            detail: detail.into(),
        }
    }

    pub fn from_platform(error: PlatformError) -> Self {
        match error {
            PlatformError::InvalidEngine(engine) => Self::bad_request(format!("invalid engine: {engine}")),
            PlatformError::EngineNotStarted => Self::bad_request("browser engine not started"),
            PlatformError::Registry(error) => Self::bad_request(error.to_string()),
            PlatformError::Engine(error) => Self::bad_request(error.to_string()),
        }
    }
}

impl IntoResponse for ApiProblem {
    fn into_response(self) -> Response {
        let status = StatusCode::from_u16(self.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        (status, Json(self)).into_response()
    }
}

pub fn snapshot_data(snapshot: &sdkwork_browser_platform_service::BrowserPlatformSnapshot) -> Value {
    json!({
        "configuredEngine": snapshot.configured_engine,
        "activeEngineId": snapshot.active_engine_id,
        "engineStarted": snapshot.engine_started,
        "activeTabId": snapshot.active_tab_id,
        "agentRuntimeId": snapshot.agent_runtime_id,
        "tabCount": snapshot.tabs.len(),
        "tabs": snapshot.tabs,
        "mcpConnectors": snapshot.mcp_connectors,
    })
}
