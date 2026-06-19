use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/browser/sessions",
        "browser",
        "browser.sessions.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/browser/tabs",
        "browser",
        "browser.tabs.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/browser/ai/actions",
        "browser",
        "browser.aiActions.create",
    ),
];

pub fn app_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
