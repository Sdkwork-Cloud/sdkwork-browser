pub const ROUTE_CRATE_PACKAGE: &str = "sdkwork-routes-browser-app-api";
pub const APP_API_PREFIX: &str = "/app/v3/api";
pub const BROWSER_APP_API_AUTHORITY: &str = "sdkwork-browser-app-api";
pub const BROWSER_APP_SDK_FAMILY: &str = "sdkwork-browser-app-sdk";
pub const BROWSER_APP_API_AUTH_MODE: &str = "dual-token";

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum HttpMethod {
    Delete,
    Get,
    Patch,
    Post,
    Put,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BrowserHttpRoute {
    pub method: HttpMethod,
    pub path: &'static str,
    pub tag: &'static str,
    pub operation_id: &'static str,
}

impl BrowserHttpRoute {
    pub const fn new(
        method: HttpMethod,
        path: &'static str,
        tag: &'static str,
        operation_id: &'static str,
    ) -> Self {
        Self {
            method,
            path,
            tag,
            operation_id,
        }
    }
}

pub fn required_dual_token_headers() -> [&'static str; 2] {
    ["Authorization", "Access-Token"]
}

pub fn app_routes() -> Vec<BrowserHttpRoute> {
    vec![
        BrowserHttpRoute::new(
            HttpMethod::Post,
            "/app/v3/api/browser/sessions",
            "browser",
            "browser.sessions.create",
        ),
        BrowserHttpRoute::new(
            HttpMethod::Post,
            "/app/v3/api/browser/tabs",
            "browser",
            "browser.tabs.create",
        ),
        BrowserHttpRoute::new(
            HttpMethod::Post,
            "/app/v3/api/browser/ai/actions",
            "browser",
            "browser.aiActions.create",
        ),
    ]
}
