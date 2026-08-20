use std::sync::Arc;

use crate::api::paths::backend_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{BrowserSessionsListData, SdkWorkPageData};

#[derive(Clone)]
pub struct BrowserApi {
    client: Arc<SdkworkHttpClient>,
}

impl BrowserApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// browser.engines.list
    pub async fn engines_list(&self) -> Result<SdkWorkPageData, SdkworkError> {
        let path = backend_path(&"/browser/engines".to_string());
        self.client.get(&path, None, None).await
    }

    /// browser.sessions.list
    pub async fn sessions_list(&self) -> Result<BrowserSessionsListData, SdkworkError> {
        let path = backend_path(&"/browser/sessions".to_string());
        self.client.get(&path, None, None).await
    }

}
