use sdkwork_browser_abstraction_service::{BrowserPlugin, BrowserPluginKind};
use sdkwork_browser_mcp_service::McpConnector;
use sdkwork_browser_tab_service::BrowserTab;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AgentCapability {
    PageUnderstanding,
    PageAction,
    FormFill,
    AutoLogin,
    AutoTest,
    DataCapture,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserPageContext {
    pub tab_id: Option<String>,
    pub url: String,
    pub title: String,
    pub html_excerpt: String,
    pub visible_text: String,
    pub meta_description: Option<String>,
    pub word_count_estimate: u32,
    pub engine_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserAiActionRequest {
    pub action: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tab_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub engine_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserAiActionResult {
    pub code: String,
    pub message: String,
    pub action: String,
    #[serde(default)]
    pub data: Value,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserAgentChatRequest {
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tab_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserAgentChatMessage {
    pub role: String,
    pub content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserAgentChatResponse {
    pub code: String,
    pub reply: BrowserAgentChatMessage,
    #[serde(default)]
    pub suggested_actions: Vec<String>,
    #[serde(default)]
    pub data: Value,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabGroupSuggestion {
    pub tab_id: String,
    pub group_id: String,
    pub label: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserAgentChatStreamResponse {
    pub code: String,
    pub chunks: Vec<String>,
    pub reply: BrowserAgentChatMessage,
    #[serde(default)]
    pub suggested_actions: Vec<String>,
}

pub struct BrowserAgentService {
    runtime_id: &'static str,
    runtime_mode: String,
}

impl BrowserAgentService {
    pub fn new() -> Self {
        Self {
            runtime_id: "sdkwork-agent-runtime",
            runtime_mode: std::env::var("BROWSER_AGENT_MODE").unwrap_or_else(|_| "rules".into()),
        }
    }

    pub fn runtime_id(&self) -> &str {
        self.runtime_id
    }

    pub fn runtime_mode(&self) -> &str {
        &self.runtime_mode
    }

    pub fn capabilities(&self) -> &'static [AgentCapability] {
        &[
            AgentCapability::PageUnderstanding,
            AgentCapability::PageAction,
        ]
    }

    pub fn build_page_context(
        &self,
        tab: Option<&BrowserTab>,
        html: Option<&str>,
        engine_id: Option<&str>,
    ) -> BrowserPageContext {
        let url = tab.map(|t| t.url.clone()).unwrap_or_default();
        let title = html
            .and_then(title_from_html)
            .or_else(|| tab.map(|t| t.title.clone()))
            .unwrap_or_else(|| page_title_from_url(&url));
        let html_excerpt = html
            .map(excerpt_html)
            .unwrap_or_else(|| format!("No live DOM yet for {url}"));
        let visible_text = html.map(visible_text_from_html).unwrap_or_default();
        let meta_description = html.and_then(meta_description_from_html);
        let word_count_estimate = visible_text
            .split_whitespace()
            .count()
            .max(html_excerpt.split_whitespace().count()) as u32;

        BrowserPageContext {
            tab_id: tab.map(|t| t.id.to_string()),
            url,
            title,
            html_excerpt,
            visible_text,
            meta_description,
            word_count_estimate,
            engine_id: engine_id.map(str::to_owned),
        }
    }

    pub fn execute_action(
        &self,
        request: &BrowserAiActionRequest,
        context: &BrowserPageContext,
        connectors: &[McpConnector],
    ) -> BrowserAiActionResult {
        let normalized = request.action.to_ascii_lowercase().replace('-', "");
        match normalized.as_str() {
            "navigate" | "open" | "goto" => BrowserAiActionResult {
                code: "OK".into(),
                message: format!(
                    "Navigation planned to {}",
                    request
                        .target_url
                        .as_deref()
                        .unwrap_or(context.url.as_str())
                ),
                action: request.action.clone(),
                data: json!({
                    "targetUrl": request.target_url,
                    "engineId": request.engine_id,
                }),
            },
            "summarize" | "summary" => BrowserAiActionResult {
                code: "OK".into(),
                message: self.summarize_context(context),
                action: request.action.clone(),
                data: json!({
                    "title": context.title,
                    "url": context.url,
                    "wordCount": context.word_count_estimate,
                    "metaDescription": context.meta_description,
                }),
            },
            "grouptabs" | "autogroup" => BrowserAiActionResult {
                code: "OK".into(),
                message: "Tab groups will be assigned from URL topics.".into(),
                action: request.action.clone(),
                data: json!({ "strategy": "domain-topic" }),
            },
            "listmcp" | "connectors" => BrowserAiActionResult {
                code: "OK".into(),
                message: format!("{} MCP connectors available.", connectors.len()),
                action: request.action.clone(),
                data: json!({
                    "connectors": connectors.iter().map(|c| json!({
                        "id": c.id,
                        "displayName": c.display_name,
                    })).collect::<Vec<_>>(),
                }),
            },
            _ => BrowserAiActionResult {
                code: "UNSUPPORTED".into(),
                message: format!(
                    "Unknown action '{}'. Try navigate, summarize, groupTabs, or listMcp.",
                    request.action
                ),
                action: request.action.clone(),
                data: json!({}),
            },
        }
    }

    pub fn chat(
        &self,
        request: &BrowserAgentChatRequest,
        context: &BrowserPageContext,
        connectors: &[McpConnector],
    ) -> BrowserAgentChatResponse {
        let message = request.message.trim();
        if self.should_use_llm() {
            match crate::llm_runtime::complete_with_llm(message, &context.title, &context.url) {
                Ok(completion) => {
                    return BrowserAgentChatResponse {
                        code: "OK".into(),
                        reply: BrowserAgentChatMessage {
                            role: "assistant".into(),
                            content: completion.content,
                            action: None,
                        },
                        suggested_actions: vec![
                            "summarize".into(),
                            "groupTabs".into(),
                            "navigate".into(),
                            "listMcp".into(),
                        ],
                        data: {
                            let mut data = self.runtime_metadata();
                            if let Some(object) = data.as_object_mut() {
                                object.insert("llmModel".into(), json!(completion.model));
                                object.insert("llmEndpoint".into(), json!(completion.endpoint));
                                object.insert("llmProvider".into(), json!("http"));
                            }
                            data
                        },
                    };
                }
                Err(error) => {
                    let mut response = self.chat_rules(message, context, connectors);
                    if let Some(object) = response.data.as_object_mut() {
                        object.insert("llmError".into(), json!(error));
                        object.insert("llmFallback".into(), json!(true));
                    }
                    response.reply.content =
                        format!("{} (LLM fallback: rules engine.)", response.reply.content);
                    return response;
                }
            }
        }

        self.chat_rules(message, context, connectors)
    }

    fn should_use_llm(&self) -> bool {
        self.runtime_mode.eq_ignore_ascii_case("llm")
            && std::env::var("BROWSER_AGENT_LLM_URL").is_ok()
    }

    fn chat_rules(
        &self,
        message: &str,
        context: &BrowserPageContext,
        connectors: &[McpConnector],
    ) -> BrowserAgentChatResponse {
        let lower = message.to_ascii_lowercase();

        if lower.contains("summarize") || lower.contains("summary") {
            return BrowserAgentChatResponse {
                code: "OK".into(),
                reply: BrowserAgentChatMessage {
                    role: "assistant".into(),
                    content: self.summarize_context(context),
                    action: Some("summarize".into()),
                },
                suggested_actions: vec!["summarize".into(), "groupTabs".into()],
                data: json!({ "contextUrl": context.url }),
            };
        }

        if lower.contains("group") && lower.contains("tab") {
            return BrowserAgentChatResponse {
                code: "OK".into(),
                reply: BrowserAgentChatMessage {
                    role: "assistant".into(),
                    content:
                        "I can cluster tabs by domain topic (workspace, dev-tools, reference, browsing)."
                            .into(),
                    action: Some("groupTabs".into()),
                },
                suggested_actions: vec!["groupTabs".into()],
                data: json!({}),
            };
        }

        if lower.contains("navigate") || lower.contains("open ") || lower.starts_with("go ") {
            return BrowserAgentChatResponse {
                code: "OK".into(),
                reply: BrowserAgentChatMessage {
                    role: "assistant".into(),
                    content: format!(
                        "Use the address bar or ask me to open a URL. Current page: {}",
                        context.url
                    ),
                    action: Some("navigate".into()),
                },
                suggested_actions: vec!["navigate".into()],
                data: json!({ "currentUrl": context.url }),
            };
        }

        if lower.contains("mcp") || lower.contains("connector") {
            let names: Vec<_> = connectors.iter().map(|c| c.display_name.as_str()).collect();
            return BrowserAgentChatResponse {
                code: "OK".into(),
                reply: BrowserAgentChatMessage {
                    role: "assistant".into(),
                    content: format!("Connected MCP tools: {}.", names.join(", ")),
                    action: Some("listMcp".into()),
                },
                suggested_actions: vec!["listMcp".into()],
                data: json!({ "connectors": names }),
            };
        }

        BrowserAgentChatResponse {
            code: "OK".into(),
            reply: BrowserAgentChatMessage {
                role: "assistant".into(),
                content: format!(
                    "I'm your SDKWork browsing agent on \"{}\". I can summarize pages, navigate, auto-group tabs, and invoke MCP connectors.{}",
                    context.title,
                    self.llm_mode_hint()
                ),
                action: None,
            },
            suggested_actions: vec![
                "summarize".into(),
                "groupTabs".into(),
                "navigate".into(),
                "listMcp".into(),
            ],
            data: {
                let mut data = json!({
                    "capabilities": self.capabilities().iter().map(|c| format!("{c:?}")).collect::<Vec<_>>(),
                });
                if let Some(object) = data.as_object_mut() {
                    object.extend(self.runtime_metadata().as_object().cloned().unwrap_or_default());
                }
                data
            },
        }
    }

    fn runtime_metadata(&self) -> Value {
        json!({
            "runtimeId": self.runtime_id,
            "runtimeMode": self.runtime_mode,
            "llmEndpointConfigured": std::env::var("BROWSER_AGENT_LLM_URL").is_ok(),
        })
    }

    pub fn runtime_diagnostics(&self, mcp_connector_count: usize) -> Value {
        crate::kernel_diagnostics::build_runtime_diagnostics(
            self.runtime_id,
            &self.runtime_mode,
            crate::kernel_diagnostics::capability_count(&self.capabilities()),
            mcp_connector_count,
            std::env::var("BROWSER_AGENT_LLM_URL").is_ok(),
        )
    }

    fn llm_mode_hint(&self) -> &'static str {
        if !self.runtime_mode.eq_ignore_ascii_case("llm") {
            return "";
        }
        if std::env::var("BROWSER_AGENT_LLM_URL").is_ok() {
            return "";
        }
        " Set BROWSER_AGENT_LLM_URL to enable HTTP inference."
    }

    pub fn chat_stream(
        &self,
        request: &BrowserAgentChatRequest,
        context: &BrowserPageContext,
        connectors: &[McpConnector],
    ) -> BrowserAgentChatStreamResponse {
        let response = self.chat(request, context, connectors);
        let chunks = response
            .reply
            .content
            .split_whitespace()
            .map(str::to_owned)
            .collect();
        BrowserAgentChatStreamResponse {
            code: response.code,
            chunks,
            reply: response.reply,
            suggested_actions: response.suggested_actions,
        }
    }

    pub fn suggest_tab_groups(tabs: &[BrowserTab]) -> Vec<TabGroupSuggestion> {
        tabs.iter()
            .map(|tab| {
                let (group_id, label) = topic_for_url(&tab.url);
                TabGroupSuggestion {
                    tab_id: tab.id.to_string(),
                    group_id: group_id.into(),
                    label: label.into(),
                }
            })
            .collect()
    }

    fn summarize_context(&self, context: &BrowserPageContext) -> String {
        let host = hostname(&context.url).unwrap_or_else(|| "this site".into());
        let meta = context
            .meta_description
            .as_deref()
            .unwrap_or("No meta description.");
        format!(
            "Page \"{}\" on {host} (~{} words). {meta} Excerpt: {}",
            context.title, context.word_count_estimate, context.html_excerpt
        )
    }
}

impl Default for BrowserAgentService {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserPlugin for BrowserAgentService {
    fn id(&self) -> &str {
        "sdkwork-browser-agent"
    }

    fn kind(&self) -> BrowserPluginKind {
        BrowserPluginKind::Agent
    }
}

fn excerpt_html(html: &str) -> String {
    let collapsed = visible_text_from_html(html);
    if collapsed.len() > 280 {
        format!("{}…", &collapsed[..280])
    } else {
        collapsed
    }
}

fn visible_text_from_html(html: &str) -> String {
    html.replace("<html>", "")
        .replace("</html>", "")
        .replace("<head>", " ")
        .replace("</head>", " ")
        .replace("<body>", " ")
        .replace("</body>", " ")
        .replace("<main>", " ")
        .replace("</main>", " ")
        .replace("<p>", " ")
        .replace("</p>", " ")
        .replace("<title>", " ")
        .replace("</title>", " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn meta_description_from_html(html: &str) -> Option<String> {
    let marker = "content=\"";
    let start = html.find(marker)? + marker.len();
    let end = html[start..].find('"')? + start;
    Some(html[start..end].to_string())
}

fn title_from_html(html: &str) -> Option<String> {
    let start = html.find("<title>")? + "<title>".len();
    let end = html[start..].find("</title>")? + start;
    let title = html[start..end].trim();
    if title.is_empty() {
        None
    } else {
        Some(title.to_string())
    }
}

fn page_title_from_url(url: &str) -> String {
    hostname(url)
        .map(|host| format!("Page on {host}"))
        .unwrap_or_else(|| "Untitled".into())
}

fn hostname(url: &str) -> Option<String> {
    let without_scheme = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);
    without_scheme.split('/').next().map(str::to_owned)
}

fn topic_for_url(url: &str) -> (&'static str, &'static str) {
    let host = hostname(url).unwrap_or_default().to_ascii_lowercase();
    if host.contains("github")
        || host.contains("gitlab")
        || host.contains("stackoverflow")
        || host.contains("npmjs")
    {
        ("dev-tools", "Development")
    } else if host.contains("docs") || host.contains("wiki") || host.contains("readthedocs") {
        ("reference", "Reference")
    } else if host.contains("localhost") || host.contains("sdkwork") || host.contains("127.0.0.1") {
        ("workspace", "Workspace")
    } else if host.is_empty() {
        ("browsing", "Browsing")
    } else {
        ("browsing", "Browsing")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_browser_tab_service::BrowserTabService;

    #[test]
    fn summarizes_page_context() {
        let mut tabs = BrowserTabService::new();
        let tab = tabs.open("Docs", "https://docs.sdkwork.local/guide").clone();
        let agent = BrowserAgentService::new();
        let context = agent.build_page_context(
            Some(&tab),
            Some("<html><head><title>Guide</title><meta name=\"description\" content=\"SDKWork browser guide\"></head><body><main>SDKWork browser guide content</main></body></html>"),
            Some("webview"),
        );
        assert_eq!(context.meta_description.as_deref(), Some("SDKWork browser guide"));
        let result = agent.execute_action(
            &BrowserAiActionRequest {
                action: "summarize".into(),
                target_url: None,
                tab_id: None,
                message: None,
                engine_id: None,
            },
            &context,
            &[],
        );
        assert_eq!(result.code, "OK");
        assert!(result.message.contains("Guide"));
    }

    #[test]
    fn chat_suggests_grouping() {
        let agent = BrowserAgentService::new();
        let context = agent.build_page_context(None, None, None);
        let response = agent.chat(
            &BrowserAgentChatRequest {
                message: "group my tabs".into(),
                tab_id: None,
            },
            &context,
            &[],
        );
        assert_eq!(response.reply.action.as_deref(), Some("groupTabs"));
    }

    #[test]
    fn chat_stream_returns_word_chunks() {
        let agent = BrowserAgentService::new();
        let context = agent.build_page_context(None, None, None);
        let stream = agent.chat_stream(
            &BrowserAgentChatRequest {
                message: "hello agent".into(),
                tab_id: None,
            },
            &context,
            &[],
        );
        assert!(stream.chunks.len() >= 3);
    }

    #[test]
    fn assigns_topic_groups_by_domain() {
        let mut tabs = BrowserTabService::new();
        tabs.open("GH", "https://github.com/org/repo");
        tabs.open("Local", "http://localhost:8080");
        let groups = BrowserAgentService::suggest_tab_groups(tabs.list());
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0].group_id, "dev-tools");
        assert_eq!(groups[1].group_id, "workspace");
    }

    #[test]
    fn exposes_runtime_mode_metadata() {
        std::env::set_var("BROWSER_AGENT_MODE", "llm");
        let agent = BrowserAgentService::new();
        assert_eq!(agent.runtime_mode(), "llm");
        let context = agent.build_page_context(None, None, None);
        let response = agent.chat(
            &BrowserAgentChatRequest {
                message: "hello".into(),
                tab_id: None,
            },
            &context,
            &[],
        );
        assert_eq!(response.data["runtimeMode"], "llm");
        std::env::remove_var("BROWSER_AGENT_MODE");
    }
}
