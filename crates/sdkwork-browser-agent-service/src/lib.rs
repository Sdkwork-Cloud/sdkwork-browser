mod agent;
mod kernel_diagnostics;
mod llm_runtime;

pub use agent::{
    AgentCapability,     BrowserAgentChatMessage, BrowserAgentChatRequest, BrowserAgentChatResponse,
    BrowserAgentChatStreamResponse, BrowserAgentService, BrowserAiActionRequest, BrowserAiActionResult, BrowserPageContext,
    TabGroupSuggestion,
};
