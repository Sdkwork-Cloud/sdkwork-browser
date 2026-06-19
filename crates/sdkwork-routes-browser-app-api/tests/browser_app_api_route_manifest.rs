use sdkwork_routes_browser_app_api::{
    app_routes, required_dual_token_headers, BrowserHttpRoute, HttpMethod, APP_API_PREFIX,
    ROUTE_CRATE_PACKAGE,
};

#[test]
fn exposes_app_api_route_manifest_identity() {
    assert_eq!(ROUTE_CRATE_PACKAGE, "sdkwork-routes-browser-app-api");
    assert_eq!(APP_API_PREFIX, "/app/v3/api");
}

#[test]
fn app_routes_expose_browser_runtime_operations() {
    let routes = app_routes();

    for route in [
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
    ] {
        assert!(
            routes.contains(&route),
            "missing browser app route: {route:?}",
        );
    }
}

#[test]
fn app_routes_use_standard_surface_and_security_contracts() {
    for route in app_routes() {
        assert!(route.path.starts_with(APP_API_PREFIX));
        assert!(!route.path.starts_with("/backend/v3/api"));
        assert!(route.path.contains("/browser/"));
        assert_eq!(route.tag, "browser");
        assert!(route.operation_id.contains('.'));
    }

    assert_eq!(
        required_dual_token_headers(),
        ["Authorization", "Access-Token"],
    );
}
