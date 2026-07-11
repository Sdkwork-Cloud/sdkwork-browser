//! Shared browser HTTP router helpers.

pub mod gateway_state;
pub mod list_query;
pub mod problem;
pub mod response;

pub use gateway_state::BrowserGatewayState;
pub use list_query::BrowserListQuery;
pub use problem::{BrowserApiError, BrowserApiProblem};
pub use response::{
    created_resource_json, ok_page_json, ok_resource_json, resolved_trace_id,
    success_created_resource_response, success_page_response, success_resource_response,
};

use axum::Router;

pub fn gateway_mount() -> axum::Router {
    axum::Router::new()
}
