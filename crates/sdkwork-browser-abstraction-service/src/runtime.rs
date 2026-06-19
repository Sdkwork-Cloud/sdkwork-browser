use async_trait::async_trait;

use crate::network::BrowserNetwork;
use crate::plugin::BrowserPluginRegistry;
use crate::profile::BrowserRuntimeProfile;
use crate::error::BrowserAbstractionError;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WebViewPlatform {
    WindowsWebView2,
    MacOsWkWebView,
    LinuxWebKitGtk,
    AndroidWebView,
    IosWkWebView,
}

#[async_trait]
pub trait BrowserRuntime: Send + Sync {
    fn profile(&self) -> BrowserRuntimeProfile;

    fn webview_platform(&self) -> Option<WebViewPlatform>;

    fn network(&self) -> &dyn BrowserNetwork;

    fn plugins(&self) -> &BrowserPluginRegistry;

    fn is_ready(&self) -> bool;

    async fn initialize(&mut self) -> Result<(), BrowserAbstractionError>;
}
