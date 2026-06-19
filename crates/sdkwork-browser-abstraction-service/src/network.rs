use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserNetworkRequest {
    pub method: String,
    pub url: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserNetworkResponse {
    pub status: u16,
    pub backend: BrowserNetworkBackend,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrowserNetworkBackend {
    SystemWebViewStack,
    ChromiumNetworkStack,
}

pub trait BrowserNetwork: Send + Sync {
    fn backend(&self) -> BrowserNetworkBackend;

    fn describe_capabilities(&self) -> &'static [&'static str];
}
