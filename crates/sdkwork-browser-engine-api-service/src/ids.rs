/// Canonical engine identifiers for registry lookup and YAML config (`browser.engine`).
pub const BROWSER_ENGINE_WEBVIEW: &str = "webview";
pub const BROWSER_ENGINE_SERVO: &str = "servo";
pub const BROWSER_ENGINE_CEF: &str = "cef";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BrowserEngineId {
    WebView,
    Servo,
    Cef,
}

impl BrowserEngineId {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::WebView => BROWSER_ENGINE_WEBVIEW,
            Self::Servo => BROWSER_ENGINE_SERVO,
            Self::Cef => BROWSER_ENGINE_CEF,
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            BROWSER_ENGINE_WEBVIEW => Some(Self::WebView),
            BROWSER_ENGINE_SERVO => Some(Self::Servo),
            BROWSER_ENGINE_CEF => Some(Self::Cef),
            _ => None,
        }
    }
}
