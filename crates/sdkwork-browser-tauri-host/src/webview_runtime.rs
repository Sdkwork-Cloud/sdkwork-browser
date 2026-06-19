use async_trait::async_trait;
use sdkwork_browser_abstraction_service::{
    BrowserAbstractionError, BrowserNetwork, BrowserPluginRegistry, BrowserRuntime,
    BrowserRuntimeProfile, WebViewPlatform,
};
use sdkwork_browser_network_service::WebViewNetworkStack;

pub struct WebViewBrowserRuntime {
    platform: WebViewPlatform,
    network: WebViewNetworkStack,
    plugins: BrowserPluginRegistry,
    ready: bool,
}

impl WebViewBrowserRuntime {
    pub fn new(platform: WebViewPlatform) -> Self {
        Self {
            platform,
            network: WebViewNetworkStack::new(),
            plugins: BrowserPluginRegistry::new(),
            ready: false,
        }
    }
}

#[async_trait]
impl BrowserRuntime for WebViewBrowserRuntime {
    fn profile(&self) -> BrowserRuntimeProfile {
        BrowserRuntimeProfile::WebView
    }

    fn webview_platform(&self) -> Option<WebViewPlatform> {
        Some(self.platform)
    }

    fn network(&self) -> &dyn BrowserNetwork {
        &self.network
    }

    fn plugins(&self) -> &BrowserPluginRegistry {
        &self.plugins
    }

    fn is_ready(&self) -> bool {
        self.ready
    }

    async fn initialize(&mut self) -> Result<(), BrowserAbstractionError> {
        self.ready = true;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn webview_runtime_uses_system_network_stack() {
        let mut runtime = WebViewBrowserRuntime::new(WebViewPlatform::WindowsWebView2);
        runtime.initialize().await.unwrap();
        assert_eq!(runtime.profile(), BrowserRuntimeProfile::WebView);
        assert!(runtime.network().describe_capabilities().contains(&"http"));
    }
}
