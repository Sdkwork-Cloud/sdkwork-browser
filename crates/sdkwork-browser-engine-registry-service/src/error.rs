use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RegistryError {
    #[error("engine already registered: {0}")]
    DuplicateEngine(String),
    #[error("engine not found: {0}")]
    EngineNotFound(String),
}
