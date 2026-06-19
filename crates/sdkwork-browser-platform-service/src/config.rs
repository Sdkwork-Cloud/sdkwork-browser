use serde::{Deserialize, Serialize};
use sdkwork_browser_engine_api_service::{
    BrowserEngineId, BROWSER_ENGINE_CEF, BROWSER_ENGINE_SERVO, BROWSER_ENGINE_WEBVIEW,
};

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserYamlConfig {
    pub browser: BrowserConfig,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserConfig {
    /// `webview` | `servo` | `cef` — PRD §8
    #[serde(default = "default_engine")]
    pub engine: String,
}

fn default_engine() -> String {
    BROWSER_ENGINE_WEBVIEW.to_string()
}

impl Default for BrowserConfig {
    fn default() -> Self {
        Self {
            engine: default_engine(),
        }
    }
}

impl BrowserConfig {
    pub fn engine_id(&self) -> Option<BrowserEngineId> {
        BrowserEngineId::parse(&self.engine)
    }

    pub fn webview() -> Self {
        Self {
            engine: BROWSER_ENGINE_WEBVIEW.to_string(),
        }
    }

    pub fn servo() -> Self {
        Self {
            engine: BROWSER_ENGINE_SERVO.to_string(),
        }
    }

    pub fn cef() -> Self {
        Self {
            engine: BROWSER_ENGINE_CEF.to_string(),
        }
    }

    pub fn from_engine_str(engine: &str) -> Option<Self> {
        BrowserEngineId::parse(engine).map(|_| Self {
            engine: engine.to_string(),
        })
    }
}

impl BrowserYamlConfig {
    pub fn from_yaml(yaml: &str) -> Result<Self, serde_yaml::Error> {
        serde_yaml::from_str(yaml)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_yaml_engine_selection() {
        let cfg = BrowserYamlConfig::from_yaml("browser:\n  engine: cef\n").unwrap();
        assert_eq!(cfg.browser.engine, "cef");
        assert_eq!(cfg.browser.engine_id(), Some(BrowserEngineId::Cef));
    }
}
