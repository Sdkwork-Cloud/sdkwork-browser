use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum BrowserEngineError {
    #[error("engine not initialized")]
    NotInitialized,
    #[error("engine already destroyed")]
    Destroyed,
    #[error("navigation unavailable: {0}")]
    NavigationUnavailable(String),
    #[error("script execution failed: {0}")]
    ScriptFailed(String),
    #[error("engine operation unsupported in current phase: {0}")]
    Unsupported(String),
}
