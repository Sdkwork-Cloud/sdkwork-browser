use async_trait::async_trait;
use sdkwork_browser_engine_api_service::{
    BrowserEngine, BrowserEngineError, BROWSER_ENGINE_SERVO,
};

use crate::servo::ServoEnginePhase;

#[derive(Debug)]
pub struct ServoBrowserEngine {
    phase: ServoEnginePhase,
    initialized: bool,
    destroyed: bool,
    current_url: String,
}

impl ServoBrowserEngine {
    pub fn new() -> Self {
        Self {
            phase: ServoEnginePhase::NotAvailable,
            initialized: false,
            destroyed: false,
            current_url: String::new(),
        }
    }

    pub fn estimated_package_size_mb(&self) -> u32 {
        80
    }
}

impl Default for ServoBrowserEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl BrowserEngine for ServoBrowserEngine {
    fn engine_id(&self) -> &'static str {
        BROWSER_ENGINE_SERVO
    }

    async fn initialize(&mut self) -> Result<(), BrowserEngineError> {
        if self.destroyed {
            return Err(BrowserEngineError::Destroyed);
        }
        // V4 roadmap: real Servo bootstrap. V1 uses in-process stub for registry parity.
        self.phase = ServoEnginePhase::Stub;
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
        Ok(format!("{{\"servo\":true,\"script\":{script:?}}}"))
    }

    async fn get_html(&self) -> Result<String, BrowserEngineError> {
        self.ensure_ready()?;
        Ok(format!("<html><body>servo:{}</body></html>", self.current_url))
    }

    async fn screenshot(&self) -> Result<Vec<u8>, BrowserEngineError> {
        self.ensure_ready()?;
        Ok(vec![0x89, 0x50, 0x4E, 0x47])
    }

    async fn destroy(&mut self) -> Result<(), BrowserEngineError> {
        self.destroyed = true;
        self.initialized = false;
        self.phase = ServoEnginePhase::NotAvailable;
        Ok(())
    }
}

impl ServoBrowserEngine {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn servo_stub_engine_loads() {
        let mut engine = ServoBrowserEngine::new();
        engine.initialize().await.unwrap();
        engine.load_url("https://sdkwork.local/").await.unwrap();
        assert!(engine.get_html().await.unwrap().contains("servo"));
    }
}
