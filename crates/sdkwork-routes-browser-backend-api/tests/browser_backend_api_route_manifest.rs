use sdkwork_routes_browser_backend_api::{
    backend_routes, browser_backend_api_route_count, required_dual_token_headers,
    BrowserHttpRoute, HttpMethod, BACKEND_API_PREFIX, ROUTE_CRATE_PACKAGE,
};

#[test]
fn exposes_backend_api_route_manifest_identity() {
    assert_eq!(ROUTE_CRATE_PACKAGE, "sdkwork-routes-browser-backend-api");
    assert_eq!(BACKEND_API_PREFIX, "/backend/v3/api");
    assert_eq!(browser_backend_api_route_count(), 3);
}

#[test]
fn backend_routes_expose_operator_surface() {
    let routes = backend_routes();

    for route in [
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
    ] {
        assert!(
            routes.contains(&route),
            "missing browser backend route: {route:?}",
        );
    }
}

#[test]
fn backend_routes_use_standard_surface_and_security_contracts() {
    for route in backend_routes() {
        assert!(route.path.starts_with(BACKEND_API_PREFIX));
        assert!(route.path.contains("/browser/"));
        assert_eq!(route.tag, "browser");
    }

    assert_eq!(
        required_dual_token_headers(),
        ["Authorization", "Access-Token"],
    );
}
