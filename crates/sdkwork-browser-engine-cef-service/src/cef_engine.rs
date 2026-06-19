use async_trait::async_trait;

use sdkwork_browser_engine_api_service::{

    BrowserEngine, BrowserEngineError, BROWSER_ENGINE_CEF,

};



use crate::engine::{CefEnginePhase, CefEngineService};



#[derive(Debug)]

pub struct CefBrowserEngine {

    inner: CefEngineService,

    initialized: bool,

    destroyed: bool,

    current_url: String,

}



impl CefBrowserEngine {

    pub fn new() -> Self {

        Self {

            inner: CefEngineService::bootstrap_stub(),

            initialized: false,

            destroyed: false,

            current_url: String::new(),

        }

    }



    pub fn estimated_package_size_mb(&self) -> u32 {

        200

    }



    pub fn binding_label(&self) -> &'static str {

        self.inner.binding_label()

    }

}



impl Default for CefBrowserEngine {

    fn default() -> Self {

        Self::new()

    }

}



#[async_trait]

impl BrowserEngine for CefBrowserEngine {

    fn engine_id(&self) -> &'static str {

        BROWSER_ENGINE_CEF

    }



    async fn initialize(&mut self) -> Result<(), BrowserEngineError> {

        if self.destroyed {

            return Err(BrowserEngineError::Destroyed);

        }

        self.inner

            .initialize_runtime()

            .map_err(|error| BrowserEngineError::Unsupported(error.to_string()))?;

        self.initialized = true;

        Ok(())

    }



    async fn load_url(&mut self, url: &str) -> Result<(), BrowserEngineError> {

        self.ensure_ready()?;

        self.current_url = url.to_string();

        Ok(())

    }



    async fn reload(&mut self) -> Result<(), BrowserEngineError> {

        self.ensure_ready()?;

        Ok(())

    }



    async fn back(&mut self) -> Result<(), BrowserEngineError> {

        self.ensure_ready()?;

        Ok(())

    }



    async fn forward(&mut self) -> Result<(), BrowserEngineError> {

        self.ensure_ready()?;

        Ok(())

    }



    async fn execute_script(&mut self, script: &str) -> Result<String, BrowserEngineError> {

        self.ensure_ready()?;

        Ok(format!(

            "{{\"binding\":\"{}\",\"cef\":true,\"script\":{script:?}}}",

            self.binding_label()

        ))

    }



    async fn get_html(&self) -> Result<String, BrowserEngineError> {

        self.ensure_ready()?;

        Ok(format!(

            "<html><body data-binding=\"{}\">cef:{}</body></html>",

            self.binding_label(),

            self.current_url

        ))

    }



    async fn screenshot(&self) -> Result<Vec<u8>, BrowserEngineError> {

        self.ensure_ready()?;

        Ok(vec![0x89, 0x50, 0x4E, 0x47])

    }



    async fn destroy(&mut self) -> Result<(), BrowserEngineError> {

        self.destroyed = true;

        self.initialized = false;

        self.inner = CefEngineService::bootstrap_stub();

        Ok(())

    }

}



impl CefBrowserEngine {

    fn ensure_ready(&self) -> Result<(), BrowserEngineError> {

        if self.destroyed {

            return Err(BrowserEngineError::Destroyed);

        }

        if !self.initialized {

            return Err(BrowserEngineError::NotInitialized);

        }

        let ready = matches!(

            self.inner.phase(),

            CefEnginePhase::Stub | CefEnginePhase::NativeReady

        );

        if !ready {

            return Err(BrowserEngineError::NotInitialized);

        }

        Ok(())

    }

}



#[cfg(test)]

mod tests {

    use super::*;



    #[tokio::test]

    async fn cef_engine_round_trip() {

        let mut engine = CefBrowserEngine::new();

        engine.initialize().await.unwrap();

        engine.load_url("https://example.com").await.unwrap();

        assert!(engine.get_html().await.unwrap().contains("cef"));

    }

}


