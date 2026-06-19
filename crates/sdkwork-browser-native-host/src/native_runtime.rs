use async_trait::async_trait;
use sdkwork_browser_abstraction_service::{
    BrowserAbstractionError, BrowserNetwork, BrowserPluginRegistry, BrowserRuntime,
    BrowserRuntimeProfile, WebViewPlatform,
};
use sdkwork_browser_engine_cef_service::CefEngineService;
use sdkwork_browser_network_service::ChromiumNetworkStack;

pub struct NativeBrowserRuntime {
    engine: CefEngineService,
    network: ChromiumNetworkStack,
    plugins: BrowserPluginRegistry,
    ready: bool,
}

impl NativeBrowserRuntime {
    pub fn new() -> Self {
        Self {
            engine: CefEngineService::bootstrap_stub(),
            network: ChromiumNetworkStack::new(),
            plugins: BrowserPluginRegistry::new(),
            ready: false,
        }
    }
}

#[async_trait]
impl BrowserRuntime for NativeBrowserRuntime {
    fn profile(&self) -> BrowserRuntimeProfile {
        BrowserRuntimeProfile::Native
    }

    fn webview_platform(&self) -> Option<WebViewPlatform> {
        None
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
        self.engine
            .initialize_runtime()
            .map_err(|error| BrowserAbstractionError::NotReady(error.to_string()))?;
        self.ready = true;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn native_runtime_targets_cef_engine() {
        let mut runtime = NativeBrowserRuntime::new();
        runtime.initialize().await.unwrap();
        assert_eq!(runtime.profile(), BrowserRuntimeProfile::Native);
        assert!(runtime.network().describe_capabilities().contains(&"http3"));
    }
}
