//! Embedded child webview — real network browsing via the system WebView engine.

use sdkwork_browser_tauri_host::{BrowserPlatformHost, PlatformHostError};
use serde::Deserialize;
use tauri::webview::{NewWindowResponse, PageLoadEvent, WebviewBuilder};
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow};
use url::Url;

pub const CONTENT_WEBVIEW_LABEL: &str = "browser-content";

/// Chrome-compatible UA so sites serve standard documents (many block the Tauri default).
const CONTENT_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";

const DOM_CAPTURE_SCRIPT: &str = r#"
(async () => {
  const html = document.documentElement?.outerHTML ?? '';
  const internals = window.__TAURI_INTERNALS__;
  if (!internals?.invoke) {
    return;
  }
  await internals.invoke('browser_sync_live_html', { html });
})();
"#;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentWebviewBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug)]
pub enum ContentWebviewError {
    Host(PlatformHostError),
    InvalidUrl(String),
    Webview(String),
}

impl From<PlatformHostError> for ContentWebviewError {
    fn from(value: PlatformHostError) -> Self {
        Self::Host(value)
    }
}

impl std::fmt::Display for ContentWebviewError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Host(error) => write!(f, "{error}"),
            Self::InvalidUrl(url) => write!(f, "invalid url: {url}"),
            Self::Webview(message) => write!(f, "webview error: {message}"),
        }
    }
}

impl serde::Serialize for ContentWebviewError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

fn shell_window(window: &WebviewWindow) -> tauri::Window {
    window.as_ref().window()
}

fn schedule_dom_capture(webview: tauri::Webview) {
    let _ = webview.eval(DOM_CAPTURE_SCRIPT);
}

fn content_profile_dir(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("browser-content-profile"))
}

fn build_content_webview(app: &AppHandle, initial_url: WebviewUrl) -> WebviewBuilder<tauri::Wry> {
    let app_nav = app.clone();
    let app_title = app.clone();
    let app_popup = app.clone();
    let app_load = app.clone();

    let mut builder = WebviewBuilder::new(CONTENT_WEBVIEW_LABEL, initial_url)
        .user_agent(CONTENT_USER_AGENT)
        .zoom_hotkeys_enabled(true)
        .enable_clipboard_access()
        .on_navigation(move |url| {
            let scheme = url.scheme();
            if matches!(scheme, "http" | "https") {
                let _ = app_nav.emit("browser-content-navigated", url.to_string());
            }
            true
        })
        .on_new_window(move |url, _features| {
            let _ = app_popup.emit("browser-content-new-window", url.to_string());
            NewWindowResponse::Deny
        })
        .on_document_title_changed(move |_webview, title| {
            let _ = app_title.emit("browser-content-title", title);
        })
        .on_page_load(move |webview, payload| {
            if payload.event() == PageLoadEvent::Finished {
                // Emit page-loaded event so the frontend can clear the loading
                // indicator. This is the reliable signal that the webview has
                // finished loading the page (more reliable than title-changed,
                // which may fire early or not at all for same-title pages).
                let _ = app_load.emit("browser-content-page-loaded", ());
                schedule_dom_capture(webview.clone());
            }
        });

    if let Some(profile_dir) = content_profile_dir(app) {
        builder = builder.data_directory(profile_dir);
    }

    #[cfg(debug_assertions)]
    {
        builder = builder.devtools(true);
    }

    builder
}

fn sync_platform_tab(host: &BrowserPlatformHost, url: String) {
    let _ = host.load_url(url);
}

pub fn mount_content_webview(
    window: &WebviewWindow,
    bounds: ContentWebviewBounds,
) -> Result<(), ContentWebviewError> {
    if bounds.width < 1.0 || bounds.height < 1.0 {
        return Ok(());
    }

    let host_window = shell_window(window);
    let position = LogicalPosition::new(bounds.x, bounds.y);
    let size = LogicalSize::new(bounds.width, bounds.height);

    if let Some(webview) = host_window.get_webview(CONTENT_WEBVIEW_LABEL) {
        webview
            .set_position(position)
            .map_err(|error| ContentWebviewError::Webview(error.to_string()))?;
        webview
            .set_size(size)
            .map_err(|error| ContentWebviewError::Webview(error.to_string()))?;
        let _ = webview.show();
        return Ok(());
    }

    let app = window.app_handle();
    let builder = build_content_webview(&app, WebviewUrl::External("about:blank".parse().unwrap()));

    host_window
        .add_child(builder, position, size)
        .map_err(|error| ContentWebviewError::Webview(error.to_string()))?;
    Ok(())
}

pub fn navigate_content_webview(
    window: &WebviewWindow,
    host: &BrowserPlatformHost,
    url: String,
) -> Result<(), ContentWebviewError> {
    let parsed: Url = url
        .parse()
        .map_err(|_| ContentWebviewError::InvalidUrl(url.clone()))?;
    let host_window = shell_window(window);

    let Some(webview) = host_window.get_webview(CONTENT_WEBVIEW_LABEL) else {
        return Err(ContentWebviewError::Webview(
            "content webview is not mounted".into(),
        ));
    };

    webview
        .navigate(parsed)
        .map_err(|error| ContentWebviewError::Webview(error.to_string()))?;

    sync_platform_tab(host, url);
    Ok(())
}

pub fn open_content_webview(
    window: &WebviewWindow,
    host: &BrowserPlatformHost,
    url: String,
    bounds: ContentWebviewBounds,
) -> Result<(), ContentWebviewError> {
    mount_content_webview(window, bounds)?;
    navigate_content_webview(window, host, url)
}

pub fn hide_content_webview(window: &WebviewWindow) -> Result<(), ContentWebviewError> {
    let host_window = shell_window(window);
    let Some(webview) = host_window.get_webview(CONTENT_WEBVIEW_LABEL) else {
        return Ok(());
    };
    webview
        .hide()
        .map_err(|error| ContentWebviewError::Webview(error.to_string()))
}

pub fn capture_content_dom(window: &WebviewWindow) -> Result<(), ContentWebviewError> {
    let host_window = shell_window(window);
    let Some(webview) = host_window.get_webview(CONTENT_WEBVIEW_LABEL) else {
        return Ok(());
    };
    schedule_dom_capture(webview);
    Ok(())
}
