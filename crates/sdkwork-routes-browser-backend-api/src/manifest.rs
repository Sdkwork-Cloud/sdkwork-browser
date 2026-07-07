pub const ROUTE_CRATE_PACKAGE: &str = "sdkwork-routes-browser-backend-api";
pub const BACKEND_API_PREFIX: &str = "/backend/v3/api";
pub const BROWSER_BACKEND_API_AUTHORITY: &str = "sdkwork-browser-backend-api";
pub const BROWSER_BACKEND_SDK_FAMILY: &str = "sdkwork-browser-backend-sdk";
pub const BROWSER_BACKEND_API_AUTH_MODE: &str = "dual-token";

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

pub fn backend_routes() -> Vec<BrowserHttpRoute> {
    vec![
        BrowserHttpRoute::new(
            HttpMethod::Get,
            "/backend/v3/api/browser/sessions",
            "browser",
            "browser.sessions.list",
        ),
        BrowserHttpRoute::new(
            HttpMethod::Get,
            "/backend/v3/api/browser/engines",
            "browser",
            "browser.engines.list",
        ),
        BrowserHttpRoute::new(
            HttpMethod::Get,
            "/backend/v3/api/browser/agent/diagnostics",
            "browser",
            "browser.agent.diagnostics",
        ),
    ]
}

pub fn browser_backend_api_route_count() -> usize {
    backend_routes().len()
}
