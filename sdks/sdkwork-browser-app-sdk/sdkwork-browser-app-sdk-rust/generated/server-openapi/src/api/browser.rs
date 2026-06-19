use std::sync::Arc;

use crate::api::paths::app_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{BrowserApiResult};

#[derive(Clone)]
pub struct BrowserApi {
    client: Arc<SdkworkHttpClient>,
}

impl BrowserApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// browser.aiActions.create
    pub async fn ai_actions_create(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<BrowserApiResult, SdkworkError> {
        let path = app_path(&"/browser/ai/actions".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// browser.sessions.create
    pub async fn sessions_create(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<BrowserApiResult, SdkworkError> {
        let path = app_path(&"/browser/sessions".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// browser.tabs.create
    pub async fn tabs_create(&self, body: &std::collections::HashMap<String, serde_json::Value>) -> Result<BrowserApiResult, SdkworkError> {
        let path = app_path(&"/browser/tabs".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
