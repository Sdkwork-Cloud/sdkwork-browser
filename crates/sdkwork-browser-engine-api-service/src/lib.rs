//! Browser Engine Standard (PRD §5). Upper layers depend only on this crate.

mod engine;
mod error;
mod ids;

pub use engine::BrowserEngine;
pub use error::BrowserEngineError;
pub use ids::{BrowserEngineId, BROWSER_ENGINE_CEF, BROWSER_ENGINE_SERVO, BROWSER_ENGINE_WEBVIEW};
