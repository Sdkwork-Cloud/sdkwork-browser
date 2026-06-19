use async_trait::async_trait;

use crate::error::BrowserEngineError;

/// Browser Engine Standard interface (PRD §5).
///
/// Applications and SDKs must depend on this trait — never on WebView, Servo, or CEF directly.
#[async_trait]
pub trait BrowserEngine: Send + Sync {
    fn engine_id(&self) -> &'static str;

    async fn initialize(&mut self) -> Result<(), BrowserEngineError>;

    async fn load_url(&mut self, url: &str) -> Result<(), BrowserEngineError>;

    async fn reload(&mut self) -> Result<(), BrowserEngineError>;

    async fn back(&mut self) -> Result<(), BrowserEngineError>;

    async fn forward(&mut self) -> Result<(), BrowserEngineError>;

    async fn execute_script(&mut self, script: &str) -> Result<String, BrowserEngineError>;

    async fn get_html(&self) -> Result<String, BrowserEngineError>;

    async fn screenshot(&self) -> Result<Vec<u8>, BrowserEngineError>;

    async fn destroy(&mut self) -> Result<(), BrowserEngineError>;
}
