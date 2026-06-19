//! CEF child-surface embedding descriptor for Tauri/desktop hosts.

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct CefSurfaceDescriptor {
    pub binding: String,
    pub embed_state: String,
    pub parent_window_label: String,
    pub width: u32,
    pub height: u32,
    pub message: String,
}

impl CefSurfaceDescriptor {
    pub fn stub(parent_window_label: impl Into<String>, width: u32, height: u32) -> Self {
        Self {
            binding: "cef-stub".into(),
            embed_state: "stub".into(),
            parent_window_label: parent_window_label.into(),
            width,
            height,
            message: "CEF surface embedding requires --features cef and a local CEF toolchain."
                .into(),
        }
    }

    pub fn from_binding(
        binding: &str,
        native_initialized: bool,
        parent_window_label: impl Into<String>,
        width: u32,
        height: u32,
    ) -> Self {
        let parent_window_label = parent_window_label.into();
        if binding == "cef-rs" && native_initialized {
            return Self {
                binding: binding.into(),
                embed_state: "ready".into(),
                parent_window_label,
                width,
                height,
                message: "cef-rs runtime initialized; attach parent HWND to create BrowserHost."
                    .into(),
            };
        }

        if binding == "cef-rs" {
            return Self {
                binding: binding.into(),
                embed_state: "pending-init".into(),
                parent_window_label,
                width,
                height,
                message: "cef-rs binding selected but runtime is not initialized yet.".into(),
            };
        }

        Self::stub(parent_window_label, width, height)
    }
}

#[cfg(feature = "cef")]
pub fn plan_native_surface(
    parent_window_label: &str,
    width: u32,
    height: u32,
    native_initialized: bool,
) -> CefSurfaceDescriptor {
    CefSurfaceDescriptor::from_binding(
        "cef-rs",
        native_initialized,
        parent_window_label,
        width,
        height,
    )
}

pub fn plan_surface(
    binding: &str,
    native_initialized: bool,
    parent_window_label: &str,
    width: u32,
    height: u32,
) -> CefSurfaceDescriptor {
    #[cfg(feature = "cef")]
    {
        return plan_native_surface(parent_window_label, width, height, native_initialized);
    }

    #[cfg(not(feature = "cef"))]
    {
        let _ = (binding, native_initialized);
        CefSurfaceDescriptor::stub(parent_window_label, width, height)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stub_surface_reports_dimensions() {
        let surface = CefSurfaceDescriptor::stub("main", 1280, 720);
        assert_eq!(surface.width, 1280);
        assert_eq!(surface.embed_state, "stub");
    }
}
