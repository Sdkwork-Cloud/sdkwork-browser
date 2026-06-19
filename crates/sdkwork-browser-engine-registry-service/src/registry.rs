use std::collections::HashMap;

use sdkwork_browser_engine_api_service::BrowserEngine;

use crate::error::RegistryError;

type EngineFactory = Box<dyn Fn() -> Box<dyn BrowserEngine> + Send + Sync>;

pub struct BrowserEngineRegistry {
    factories: HashMap<String, EngineFactory>,
}

impl Default for BrowserEngineRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserEngineRegistry {
    pub fn new() -> Self {
        Self {
            factories: HashMap::new(),
        }
    }

    pub fn register<F>(&mut self, engine_id: &str, factory: F) -> Result<(), RegistryError>
    where
        F: Fn() -> Box<dyn BrowserEngine> + Send + Sync + 'static,
    {
        if self.factories.contains_key(engine_id) {
            return Err(RegistryError::DuplicateEngine(engine_id.to_string()));
        }
        self.factories.insert(engine_id.to_string(), Box::new(factory));
        Ok(())
    }

    pub fn get(&self, engine_id: &str) -> Result<Box<dyn BrowserEngine>, RegistryError> {
        let factory = self
            .factories
            .get(engine_id)
            .ok_or_else(|| RegistryError::EngineNotFound(engine_id.to_string()))?;
        Ok(factory())
    }

    pub fn list_engine_ids(&self) -> Vec<String> {
        let mut ids: Vec<_> = self.factories.keys().cloned().collect();
        ids.sort();
        ids
    }
}

pub fn bootstrap_default_registry() -> BrowserEngineRegistry {
    use sdkwork_browser_engine_api_service::{
        BROWSER_ENGINE_CEF, BROWSER_ENGINE_SERVO, BROWSER_ENGINE_WEBVIEW,
    };
    use sdkwork_browser_engine_cef_service::CefBrowserEngine;
    use sdkwork_browser_engine_servo_service::ServoBrowserEngine;
    use sdkwork_browser_engine_webview_service::WebViewBrowserEngine;

    let mut registry = BrowserEngineRegistry::new();
    registry
        .register(BROWSER_ENGINE_WEBVIEW, || Box::new(WebViewBrowserEngine::new()))
        .expect("webview engine");
    registry
        .register(BROWSER_ENGINE_SERVO, || Box::new(ServoBrowserEngine::new()))
        .expect("servo engine");
    registry
        .register(BROWSER_ENGINE_CEF, || Box::new(CefBrowserEngine::new()))
        .expect("cef engine");
    registry
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_browser_engine_api_service::BROWSER_ENGINE_WEBVIEW;

    #[test]
    fn registers_and_resolves_default_engines() {
        let registry = bootstrap_default_registry();
        assert_eq!(registry.list_engine_ids().len(), 3);
        let engine = registry.get(BROWSER_ENGINE_WEBVIEW).unwrap();
        assert_eq!(engine.engine_id(), BROWSER_ENGINE_WEBVIEW);
    }
}
