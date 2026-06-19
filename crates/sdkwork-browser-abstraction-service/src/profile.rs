use serde::{Deserialize, Serialize};

/// Selects between system WebView (default) and embedded native engine (CEF).
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrowserRuntimeProfile {
    /// Tauri + system WebView2 / WKWebView / WebKitGTK / Android WebView.
    WebView,
    /// Rust native host + Chromium Embedded Framework.
    Native,
}

impl BrowserRuntimeProfile {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::WebView => "webview",
            Self::Native => "native",
        }
    }
}
