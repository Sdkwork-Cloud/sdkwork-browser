//! Embedded child webview for real page rendering and DOM capture.

use sdkwork_browser_tauri_host::{BrowserPlatformHost, PlatformHostError};
use serde::Deserialize;
use tauri::webview::{PageLoadEvent, WebviewBuilder};
use tauri::{LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow};
use url::Url;

pub const CONTENT_WEBVIEW_LABEL: &str = "browser-content";

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
        return Ok(());
    }

    let builder = WebviewBuilder::new(
        CONTENT_WEBVIEW_LABEL,
        WebviewUrl::External("about:blank".parse().unwrap()),
    )
    .on_page_load(|webview, payload| {
        if payload.event() == PageLoadEvent::Finished {
            schedule_dom_capture(webview.clone());
        }
    });

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

    if let Some(webview) = host_window.get_webview(CONTENT_WEBVIEW_LABEL) {
        webview
            .navigate(parsed)
            .map_err(|error| ContentWebviewError::Webview(error.to_string()))?;
    } else {
        let builder =
            WebviewBuilder::new(CONTENT_WEBVIEW_LABEL, WebviewUrl::External(parsed)).on_page_load(
                |webview, payload| {
                    if payload.event() == PageLoadEvent::Finished {
                        schedule_dom_capture(webview.clone());
                    }
                },
            );
        host_window
            .add_child(
                builder,
                LogicalPosition::new(0.0, 200.0),
                LogicalSize::new(800.0, 288.0),
            )
            .map_err(|error| ContentWebviewError::Webview(error.to_string()))?;
    }

    host.load_url(url).map(|_| ())?;
    Ok(())
}

pub fn capture_content_dom(window: &WebviewWindow) -> Result<(), ContentWebviewError> {
    let host_window = shell_window(window);
    let Some(webview) = host_window.get_webview(CONTENT_WEBVIEW_LABEL) else {
        return Ok(());
    };
    schedule_dom_capture(webview);
    Ok(())
}
