use sdkwork_browser_abstraction_service::{BrowserNetwork, BrowserNetworkBackend};

pub struct ChromiumNetworkStack;

impl ChromiumNetworkStack {
    pub fn new() -> Self {
        Self
    }
}

impl Default for ChromiumNetworkStack {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserNetwork for ChromiumNetworkStack {
    fn backend(&self) -> BrowserNetworkBackend {
        BrowserNetworkBackend::ChromiumNetworkStack
    }

    fn describe_capabilities(&self) -> &'static [&'static str] {
        &["http", "https", "http2", "http3", "websocket", "sse", "grpc-web"]
    }
}
