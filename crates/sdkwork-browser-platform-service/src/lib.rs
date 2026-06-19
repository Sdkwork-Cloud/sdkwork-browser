//! Browser Runtime Platform — top-level Browser API (PRD §4).

mod config;
mod platform;

pub use config::{BrowserConfig, BrowserYamlConfig};
pub use platform::{
    BrowserEngineDescriptor, BrowserOperatorSession, BrowserPlatform, BrowserPlatformSnapshot,
    BrowserTabSnapshot, McpConnectorSnapshot, PlatformError,
};
pub use sdkwork_browser_agent_service::{
    BrowserAgentChatMessage, BrowserAgentChatRequest, BrowserAgentChatResponse,
    BrowserAgentChatStreamResponse, BrowserAiActionRequest, BrowserAiActionResult,
    BrowserPageContext, TabGroupSuggestion,
};
pub use sdkwork_browser_mcp_service::{
    McpToolDescriptor, McpToolInvokeRequest, McpToolInvokeResult,
};
pub use sdkwork_browser_engine_cef_service::CefSurfaceDescriptor;
