use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/browser/sessions",
        "browser",
        "browser.sessions.list",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/browser/engines",
        "browser",
        "browser.engines.list",
    ),
];

pub fn backend_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
