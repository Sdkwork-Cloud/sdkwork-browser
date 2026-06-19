use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum BrowserAbstractionError {
    #[error("unsupported browser runtime profile: {0}")]
    UnsupportedProfile(String),
    #[error("native engine is not available in this build profile")]
    NativeEngineUnavailable,
    #[error("runtime is not ready: {0}")]
    NotReady(String),
}
