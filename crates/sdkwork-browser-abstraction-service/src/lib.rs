//! Unified browser abstraction layer for WebView and Native runtimes.

mod error;
mod network;
mod plugin;
mod profile;
mod runtime;

pub use error::BrowserAbstractionError;
pub use network::{BrowserNetwork, BrowserNetworkBackend, BrowserNetworkRequest, BrowserNetworkResponse};
pub use plugin::{BrowserPlugin, BrowserPluginKind, BrowserPluginRegistry};
pub use profile::BrowserRuntimeProfile;
pub use runtime::{BrowserRuntime, WebViewPlatform};
