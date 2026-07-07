use std::sync::Arc;

use sdkwork_browser_platform_service::BrowserPlatform;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct BrowserGatewayState {
    platform: Arc<Mutex<BrowserPlatform>>,
}

impl BrowserGatewayState {
    pub fn new(platform: BrowserPlatform) -> Self {
        Self {
            platform: Arc::new(Mutex::new(platform)),
        }
    }

    pub fn platform(&self) -> Arc<Mutex<BrowserPlatform>> {
        Arc::clone(&self.platform)
    }
}
