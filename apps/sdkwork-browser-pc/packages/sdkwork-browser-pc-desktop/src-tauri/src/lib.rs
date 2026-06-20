mod content_webview;

use content_webview::{ContentWebviewBounds, ContentWebviewError};
use sdkwork_browser_platform_service::BrowserPlatformSnapshot;
use sdkwork_browser_platform_service::{
    BrowserAgentChatRequest, BrowserAgentChatResponse, BrowserAgentChatStreamResponse,
    BrowserAiActionRequest, BrowserAiActionResult, BrowserPageContext, CefSurfaceDescriptor,
    McpToolDescriptor, McpToolInvokeRequest, McpToolInvokeResult, TabGroupSuggestion,
};
use sdkwork_browser_tauri_host::{
    browser_host_status, BrowserHostStatus, BrowserPlatformHost, PlatformHostError,
};
use tauri::{State, WebviewWindow};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let platform_host = BrowserPlatformHost::new().expect("browser platform host");
    tauri::Builder::default()
        .manage(platform_host)
        .invoke_handler(tauri::generate_handler![
            host_status,
            browser_platform_snapshot,
            browser_start_engine,
            browser_load_url,
            browser_switch_engine,
            browser_cef_surface,
            browser_sync_live_html,
            browser_page_context,
            browser_agent_execute,
            browser_agent_chat,
            browser_agent_chat_stream,
            browser_mcp_list_tools,
            browser_mcp_invoke,
            browser_group_tabs,
            browser_set_active_tab,
            browser_content_mount,
            browser_content_navigate,
            browser_content_open,
            browser_content_hide,
            browser_content_capture,
            desktop_window_minimize,
            desktop_window_toggle_maximize,
            desktop_window_close,
            desktop_window_is_maximized,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run SDKWork Browser desktop host");
}

#[tauri::command]
fn host_status() -> BrowserHostStatus {
    browser_host_status()
}

#[tauri::command]
fn browser_platform_snapshot(
    host: State<'_, BrowserPlatformHost>,
) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
    host.snapshot()
}

#[tauri::command]
fn browser_start_engine(
    host: State<'_, BrowserPlatformHost>,
) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
    host.start_engine()
}

#[tauri::command]
fn browser_load_url(
    host: State<'_, BrowserPlatformHost>,
    url: String,
) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
    host.load_url(url)
}

#[tauri::command]
fn browser_switch_engine(
    host: State<'_, BrowserPlatformHost>,
    engine: String,
) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
    host.switch_engine(engine)
}

#[tauri::command]
fn browser_cef_surface(
    host: State<'_, BrowserPlatformHost>,
    window: WebviewWindow,
) -> Result<Option<CefSurfaceDescriptor>, PlatformHostError> {
    let size = window
        .inner_size()
        .map_err(|error| PlatformHostError::Window(error.to_string()))?;
    host.cef_surface(window.label().to_string(), size.width, size.height)
}

#[tauri::command]
fn browser_sync_live_html(
    host: State<'_, BrowserPlatformHost>,
    html: Option<String>,
) -> Result<(), PlatformHostError> {
    host.set_live_html(html)
}

#[tauri::command]
fn browser_page_context(
    host: State<'_, BrowserPlatformHost>,
) -> Result<BrowserPageContext, PlatformHostError> {
    host.page_context()
}

#[tauri::command]
fn browser_agent_execute(
    host: State<'_, BrowserPlatformHost>,
    request: BrowserAiActionRequest,
) -> Result<BrowserAiActionResult, PlatformHostError> {
    host.execute_ai_action(request)
}

#[tauri::command]
fn browser_agent_chat(
    host: State<'_, BrowserPlatformHost>,
    request: BrowserAgentChatRequest,
) -> Result<BrowserAgentChatResponse, PlatformHostError> {
    host.agent_chat(request)
}

#[tauri::command]
fn browser_agent_chat_stream(
    host: State<'_, BrowserPlatformHost>,
    request: BrowserAgentChatRequest,
) -> Result<BrowserAgentChatStreamResponse, PlatformHostError> {
    host.agent_chat_stream(request)
}

#[tauri::command]
fn browser_mcp_list_tools(
    host: State<'_, BrowserPlatformHost>,
) -> Result<Vec<McpToolDescriptor>, PlatformHostError> {
    host.list_mcp_tools()
}

#[tauri::command]
fn browser_mcp_invoke(
    host: State<'_, BrowserPlatformHost>,
    request: McpToolInvokeRequest,
) -> Result<McpToolInvokeResult, PlatformHostError> {
    host.invoke_mcp_tool(request)
}

#[tauri::command]
fn browser_group_tabs(
    host: State<'_, BrowserPlatformHost>,
) -> Result<(BrowserPlatformSnapshot, Vec<TabGroupSuggestion>), PlatformHostError> {
    host.auto_group_tabs()
}

#[tauri::command]
fn browser_set_active_tab(
    host: State<'_, BrowserPlatformHost>,
    tab_id: String,
) -> Result<BrowserPlatformSnapshot, PlatformHostError> {
    host.set_active_tab(tab_id)
}

#[tauri::command]
fn browser_content_mount(
    window: WebviewWindow,
    bounds: ContentWebviewBounds,
) -> Result<(), ContentWebviewError> {
    content_webview::mount_content_webview(&window, bounds)
}

#[tauri::command]
fn browser_content_navigate(
    window: WebviewWindow,
    host: State<'_, BrowserPlatformHost>,
    url: String,
) -> Result<BrowserPlatformSnapshot, ContentWebviewError> {
    content_webview::navigate_content_webview(&window, &host, url)?;
    host.snapshot().map_err(ContentWebviewError::Host)
}

#[tauri::command]
fn browser_content_open(
    window: WebviewWindow,
    host: State<'_, BrowserPlatformHost>,
    url: String,
    bounds: ContentWebviewBounds,
) -> Result<BrowserPlatformSnapshot, ContentWebviewError> {
    content_webview::open_content_webview(&window, &host, url, bounds)?;
    host.snapshot().map_err(ContentWebviewError::Host)
}

#[tauri::command]
fn browser_content_hide(window: WebviewWindow) -> Result<(), ContentWebviewError> {
    content_webview::hide_content_webview(&window)
}

#[tauri::command]
fn browser_content_capture(window: WebviewWindow) -> Result<(), ContentWebviewError> {
    content_webview::capture_content_dom(&window)
}

#[tauri::command]
fn desktop_window_minimize(window: WebviewWindow) -> Result<(), String> {
    window
        .minimize()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn desktop_window_toggle_maximize(window: WebviewWindow) -> Result<(), String> {
    if window
        .is_maximized()
        .map_err(|error| error.to_string())?
    {
        window
            .unmaximize()
            .map_err(|error| error.to_string())
    } else {
        window.maximize().map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn desktop_window_close(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|error| error.to_string())
}

#[tauri::command]
fn desktop_window_is_maximized(window: WebviewWindow) -> Result<bool, String> {
    window
        .is_maximized()
        .map_err(|error| error.to_string())
}
