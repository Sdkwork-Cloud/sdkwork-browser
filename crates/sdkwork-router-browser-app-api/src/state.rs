use std::sync::Arc;

use sdkwork_browser_platform_service::BrowserPlatform;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct BrowserAppState {
    pub platform: Arc<Mutex<BrowserPlatform>>,
}

impl BrowserAppState {
    pub fn new(platform: BrowserPlatform) -> Self {
        Self {
            platform: Arc::new(Mutex::new(platform)),
        }
    }
}
