use sdkwork_browser_abstraction_service::{BrowserNetwork, BrowserNetworkBackend};

pub struct WebViewNetworkStack;

impl WebViewNetworkStack {
    pub fn new() -> Self {
        Self
    }
}

impl Default for WebViewNetworkStack {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserNetwork for WebViewNetworkStack {
    fn backend(&self) -> BrowserNetworkBackend {
        BrowserNetworkBackend::SystemWebViewStack
    }

    fn describe_capabilities(&self) -> &'static [&'static str] {
        &["http", "https", "http2", "websocket", "sse"]
    }
}
