mod cef_engine;
mod cef_surface;
mod engine;

#[cfg(feature = "cef")]
mod cef_native;

pub use cef_engine::CefBrowserEngine;
pub use cef_surface::{plan_surface, CefSurfaceDescriptor};
pub use engine::{CefEnginePhase, CefEngineService};

#[cfg(feature = "cef")]
pub use cef_native::{probe_native_runtime, CefNativeProbe};

pub fn is_native_runtime_initialized() -> bool {
    #[cfg(feature = "cef")]
    {
        return cef_native::is_native_runtime_initialized();
    }

    #[cfg(not(feature = "cef"))]
    {
        false
    }
}
