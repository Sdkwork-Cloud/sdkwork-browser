//! Tauri command surface for BrowserPlatform.

use std::sync::Mutex;

use sdkwork_browser_platform_service::{
    BrowserAgentChatRequest, BrowserAgentChatResponse, BrowserAgentChatStreamResponse,
    BrowserAiActionRequest, BrowserAiActionResult, BrowserConfig, BrowserPageContext,
    BrowserPlatform, BrowserPlatformSnapshot, CefSurfaceDescriptor, McpToolDescriptor,
    McpToolInvokeRequest, McpToolInvokeResult, PlatformError, TabGroupSuggestion,
};
use serde::Serialize;
use tokio::runtime::Runtime;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum PlatformHostError {
    #[error(transparent)]
    Platform(#[from] PlatformError),
    #[error("platform host lock poisoned")]
    LockPoisoned,
    #[error("invalid engine id: {0}")]
    InvalidEngine(String),
    #[error("invalid tab id: {0}")]
    InvalidTabId(String),
    #[error("window unavailable: {0}")]
    Window(String),
}

impl Serialize for PlatformHostError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub struct BrowserPlatformHost {
    runtime: Runtime,
    platform: Mutex<BrowserPlatform>,
}

impl BrowserPlatformHost {
    pub fn new() -> Result<Self, PlatformError> {
        let runtime = Runtime::new().expect("tokio runtime for browser platform host");
        let platform = BrowserPlatform::with_default_config()?;
        Ok(Self {
            runtime,
            platform: Mutex::new(platform),
        })
    }

    pub fn snapshot(&self) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
        let platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        Ok(platform.snapshot())
    }

    pub fn start_engine(&self) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
        let mut platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        self.runtime
            .block_on(platform.start_engine())
            .map_err(PlatformHostError::Platform)?;
        Ok(platform.snapshot())
    }

    pub fn load_url(&self, url: String) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
        let mut platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        if platform.active_engine_id().is_none() {
            self.runtime
                .block_on(platform.start_engine())
                .map_err(PlatformHostError::Platform)?;
        }
        self.runtime
            .block_on(platform.load_url(&url))
            .map_err(PlatformHostError::Platform)?;
        Ok(platform.snapshot())
    }

    pub fn switch_engine(&self, engine: String) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
        BrowserConfig::from_engine_str(&engine)
            .ok_or_else(|| PlatformHostError::InvalidEngine(engine.clone()))?;
        let mut platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        self.runtime
            .block_on(platform.switch_engine(&engine))
            .map_err(PlatformHostError::Platform)?;
        Ok(platform.snapshot())
    }

    pub fn cef_surface(
        &self,
        parent_window_label: String,
        width: u32,
        height: u32,
    ) -> Result<Option<CefSurfaceDescriptor>, PlatformHostError> {
        let platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        Ok(platform.cef_surface_descriptor(&parent_window_label, width, height))
    }

    pub fn set_live_html(&self, html: Option<String>) -> Result<(), PlatformHostError> {
        let mut platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        platform.set_live_html(html);
        Ok(())
    }

    pub fn page_context(&self) -> Result<BrowserPageContext, PlatformHostError> {
        let platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        self.runtime
            .block_on(platform.page_context())
            .map_err(PlatformHostError::Platform)
    }

    pub fn execute_ai_action(
        &self,
        request: BrowserAiActionRequest,
    ) -> Result<BrowserAiActionResult, PlatformHostError> {
        let mut platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        if platform.active_engine_id().is_none() {
            self.runtime
                .block_on(platform.start_engine())
                .map_err(PlatformHostError::Platform)?;
        }
        self.runtime
            .block_on(platform.execute_ai_action(request))
            .map_err(PlatformHostError::Platform)
    }

    pub fn agent_chat(
        &self,
        request: BrowserAgentChatRequest,
    ) -> Result<BrowserAgentChatResponse, PlatformHostError> {
        let platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        self.runtime
            .block_on(platform.agent_chat(request))
            .map_err(PlatformHostError::Platform)
    }

    pub fn agent_chat_stream(
        &self,
        request: BrowserAgentChatRequest,
    ) -> Result<BrowserAgentChatStreamResponse, PlatformHostError> {
        let platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        self.runtime
            .block_on(platform.agent_chat_stream(request))
            .map_err(PlatformHostError::Platform)
    }

    pub fn list_mcp_tools(&self) -> Result<Vec<McpToolDescriptor>, PlatformHostError> {
        let platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        Ok(platform.list_mcp_tools())
    }

    pub fn invoke_mcp_tool(
        &self,
        request: McpToolInvokeRequest,
    ) -> Result<McpToolInvokeResult, PlatformHostError> {
        let platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        Ok(platform.invoke_mcp_tool(request))
    }

    pub fn auto_group_tabs(
        &self,
    ) -> Result<(BrowserPlatformSnapshot, Vec<TabGroupSuggestion>), PlatformHostError> {
        let mut platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        let suggestions = platform.auto_group_tabs();
        Ok((platform.snapshot(), suggestions))
    }

    pub fn set_active_tab(&self, tab_id: String) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
        let parsed =
            Uuid::parse_str(&tab_id).map_err(|_| PlatformHostError::InvalidTabId(tab_id.clone()))?;
        let mut platform = self.platform.lock().map_err(|_| PlatformHostError::LockPoisoned)?;
        if !platform.set_active_tab(parsed) {
            return Err(PlatformHostError::InvalidTabId(tab_id));
        }
        Ok(platform.snapshot())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_browser_platform_service::BrowserAiActionRequest;

    #[test]
    fn host_bootstraps_default_platform() {
        let host = BrowserPlatformHost::new().expect("host");
        let snapshot = host.snapshot().expect("snapshot");
        assert_eq!(snapshot.configured_engine, "webview");
        assert!(!snapshot.agent_runtime_id.is_empty());
    }

    #[test]
    fn cef_surface_none_for_webview_engine() {
        let host = BrowserPlatformHost::new().expect("host");
        let surface = host.cef_surface("main".into(), 1280, 720).expect("surface");
        assert!(surface.is_none());
    }

    #[test]
    fn agent_chat_returns_reply() {
        let host = BrowserPlatformHost::new().expect("host");
        let response = host
            .agent_chat(BrowserAgentChatRequest {
                message: "hello".into(),
                tab_id: None,
            })
            .expect("chat");
        assert_eq!(response.code, "OK");
        assert_eq!(response.reply.role, "assistant");
    }

    #[test]
    fn agent_chat_stream_returns_chunks() {
        let host = BrowserPlatformHost::new().expect("host");
        let response = host
            .agent_chat_stream(BrowserAgentChatRequest {
                message: "hello".into(),
                tab_id: None,
            })
            .expect("stream");
        assert!(!response.chunks.is_empty());
    }

    #[test]
    fn execute_ai_action_summarize() {
        let host = BrowserPlatformHost::new().expect("host");
        host.start_engine().expect("engine");
        let result = host
            .execute_ai_action(BrowserAiActionRequest {
                action: "summarize".into(),
                target_url: None,
                tab_id: None,
                message: None,
                engine_id: None,
            })
            .expect("action");
        assert_eq!(result.code, "OK");
    }

    #[test]
    fn live_html_overrides_page_context() {
        let host = BrowserPlatformHost::new().expect("host");
        host.set_live_html(Some(
            "<html><head><title>Live</title><meta name=\"description\" content=\"Captured DOM\"></head><body><main>Live page</main></body></html>".into(),
        ))
        .expect("live html");
        let context = host.page_context().expect("context");
        assert_eq!(context.title, "Live");
        assert_eq!(context.meta_description.as_deref(), Some("Captured DOM"));
    }
}
