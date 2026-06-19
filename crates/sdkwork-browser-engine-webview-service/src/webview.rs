use async_trait::async_trait;
use sdkwork_browser_engine_api_service::{
    BrowserEngine, BrowserEngineError, BROWSER_ENGINE_WEBVIEW,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WebViewBrowserEngine {
    initialized: bool,
    destroyed: bool,
    current_url: String,
    html: String,
}

impl WebViewBrowserEngine {
    pub fn new() -> Self {
        Self {
            initialized: false,
            destroyed: false,
            current_url: String::new(),
            html: String::from("<html><body></body></html>"),
        }
    }

    pub fn estimated_package_size_mb(&self) -> u32 {
        10
    }

    fn page_title(&self) -> String {
        if self.current_url.is_empty() {
            return "New Tab".into();
        }
        hostname(&self.current_url)
            .map(|host| format!("Page on {host}"))
            .unwrap_or_else(|| "Page".into())
    }

    fn meta_description(&self) -> String {
        if self.current_url.is_empty() {
            return "Empty browser tab.".into();
        }
        format!(
            "Rendered document for {} in the WebView engine stub.",
            self.current_url
        )
    }

    fn visible_text(&self) -> String {
        if self.current_url.is_empty() {
            return String::new();
        }
        format!(
            "Primary content for {}. This simulates extracted visible text for AI page understanding.",
            hostname(&self.current_url).unwrap_or_else(|| "current site".into())
        )
    }

    fn render_document_html(&self) -> String {
        format!(
            "<html><head><title>{}</title><meta name=\"description\" content=\"{}\"></head><body><main>{}</main><p>loaded:{}</p></body></html>",
            self.page_title(),
            self.meta_description(),
            self.visible_text(),
            self.current_url
        )
    }
}

impl Default for WebViewBrowserEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl BrowserEngine for WebViewBrowserEngine {
    fn engine_id(&self) -> &'static str {
        BROWSER_ENGINE_WEBVIEW
    }

    async fn initialize(&mut self) -> Result<(), BrowserEngineError> {
        if self.destroyed {
            return Err(BrowserEngineError::Destroyed);
        }
        self.initialized = true;
        Ok(())
    }

    async fn load_url(&mut self, url: &str) -> Result<(), BrowserEngineError> {
        self.ensure_ready()?;
        self.current_url = url.to_string();
        self.html = self.render_document_html();
        Ok(())
    }

    async fn reload(&mut self) -> Result<(), BrowserEngineError> {
        self.ensure_ready()?;
        if self.current_url.is_empty() {
            return Err(BrowserEngineError::NavigationUnavailable(
                "no active document".into(),
            ));
        }
        self.html = self.render_document_html();
        Ok(())
    }

    async fn back(&mut self) -> Result<(), BrowserEngineError> {
        self.ensure_ready()?;
        Err(BrowserEngineError::NavigationUnavailable(
            "history stack not wired in V1 stub".into(),
        ))
    }

    async fn forward(&mut self) -> Result<(), BrowserEngineError> {
        self.ensure_ready()?;
        Err(BrowserEngineError::NavigationUnavailable(
            "history stack not wired in V1 stub".into(),
        ))
    }

    async fn execute_script(&mut self, script: &str) -> Result<String, BrowserEngineError> {
        self.ensure_ready()?;
        if script.contains("document.documentElement.outerHTML") {
            return Ok(self.render_document_html());
        }
        if script.contains("document.title") {
            return Ok(format!("\"{}\"", self.page_title()));
        }
        if script.contains("document.body.innerText") {
            return Ok(format!("\"{}\"", self.visible_text()));
        }
        Ok(format!("{{\"evaluated\":{script:?}}}"))
    }

    async fn get_html(&self) -> Result<String, BrowserEngineError> {
        self.ensure_ready()?;
        if self.current_url.is_empty() {
            return Ok(self.html.clone());
        }
        Ok(self.render_document_html())
    }

    async fn screenshot(&self) -> Result<Vec<u8>, BrowserEngineError> {
        self.ensure_ready()?;
        Ok(vec![0x89, 0x50, 0x4E, 0x47])
    }

    async fn destroy(&mut self) -> Result<(), BrowserEngineError> {
        self.destroyed = true;
        self.initialized = false;
        Ok(())
    }
}

impl WebViewBrowserEngine {
    fn ensure_ready(&self) -> Result<(), BrowserEngineError> {
        if self.destroyed {
            return Err(BrowserEngineError::Destroyed);
        }
        if !self.initialized {
            return Err(BrowserEngineError::NotInitialized);
        }
        Ok(())
    }
}

fn hostname(url: &str) -> Option<String> {
    let without_scheme = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);
    without_scheme.split('/').next().map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn loads_url_after_initialize() {
        let mut engine = WebViewBrowserEngine::new();
        engine.initialize().await.unwrap();
        engine.load_url("https://sdkwork.local/").await.unwrap();
        let html = engine.get_html().await.unwrap();
        assert!(html.contains("sdkwork.local"));
        assert!(html.contains("meta name=\"description\""));
    }

    #[tokio::test]
    async fn execute_script_returns_outer_html() {
        let mut engine = WebViewBrowserEngine::new();
        engine.initialize().await.unwrap();
        engine.load_url("https://example.com/docs").await.unwrap();
        let html = engine
            .execute_script("document.documentElement.outerHTML")
            .await
            .unwrap();
        assert!(html.contains("example.com"));
    }
}
