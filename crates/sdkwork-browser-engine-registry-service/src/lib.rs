//! Browser Engine Registry (PRD §7).

mod error;
mod registry;

pub use error::RegistryError;
pub use registry::{bootstrap_default_registry, BrowserEngineRegistry};
