//! cef-rs native runtime binding (tauri-apps/cef-rs).
//!
//! Enabled with the `cef` feature. Requires CEF binaries (see cef-rs README).

use std::ffi::CStr;
use std::ptr;
use std::sync::atomic::{AtomicBool, Ordering};

use cef::{api_hash, api_version, execute_process, initialize, shutdown, sys, wrap_app, App, Settings};

static CEF_INITIALIZED: AtomicBool = AtomicBool::new(false);

wrap_app! {
    struct SdkworkBrowserCefApp;

    impl App {}
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CefNativeProbe {
    pub api_version: i32,
    pub api_hash: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CefNativeError {
    SubprocessExit(i32),
    InitializeFailed(i32),
    AlreadyInitialized,
}

impl std::fmt::Display for CefNativeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::SubprocessExit(code) => write!(f, "cef subprocess exited with code {code}"),
            Self::InitializeFailed(code) => write!(f, "cef_initialize returned {code}"),
            Self::AlreadyInitialized => write!(f, "cef runtime already initialized"),
        }
    }
}

impl std::error::Error for CefNativeError {}

pub fn probe_native_runtime() -> CefNativeProbe {
    let hash_ptr = api_hash(sys::CEF_API_VERSION_LAST, 0);
    let api_hash = unsafe { CStr::from_ptr(hash_ptr) }
        .to_string_lossy()
        .into_owned();

    CefNativeProbe {
        api_version: api_version(),
        api_hash,
    }
}

pub fn initialize_native_runtime() -> Result<CefNativeProbe, CefNativeError> {
    if CEF_INITIALIZED.load(Ordering::SeqCst) {
        return Ok(probe_native_runtime());
    }

    let subprocess_exit = execute_process(None, None, ptr::null_mut());
    if subprocess_exit >= 0 {
        return Err(CefNativeError::SubprocessExit(subprocess_exit));
    }

    let mut settings = Settings::default();
    settings.no_sandbox = 1;
    settings.multi_threaded_message_loop = 1;
    let mut app = SdkworkBrowserCefApp::new();

    let init_code = initialize(None, Some(&settings), Some(&mut app), ptr::null_mut());
    if init_code != 1 {
        return Err(CefNativeError::InitializeFailed(init_code));
    }

    CEF_INITIALIZED.store(true, Ordering::SeqCst);
    Ok(probe_native_runtime())
}

pub fn shutdown_native_runtime() {
    if CEF_INITIALIZED.swap(false, Ordering::SeqCst) {
        shutdown();
    }
}

pub fn is_native_runtime_initialized() -> bool {
    CEF_INITIALIZED.load(Ordering::SeqCst)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn probe_reports_api_metadata() {
        let probe = probe_native_runtime();
        assert!(probe.api_version > 0);
        assert!(!probe.api_hash.is_empty());
    }
}
