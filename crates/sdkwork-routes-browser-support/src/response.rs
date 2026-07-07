use axum::{
    http::{HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sdkwork_utils_rust::{SdkWorkApiResponse, SdkWorkResourceData};
use serde::Serialize;
use sdkwork_web_core::new_request_id;

use crate::problem::BrowserApiProblem;

pub fn resolved_trace_id() -> String {
    new_request_id()
}

fn attach_trace_header(response: &mut Response, trace_id: &str) {
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response.headers_mut().insert(
            HeaderName::from_static("x-sdkwork-trace-id"),
            value,
        );
    }
}

fn success_response<T: Serialize>(status: StatusCode, data: T) -> Response {
    let trace_id = resolved_trace_id();
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (status, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

pub fn ok_resource_json<T, E>(result: Result<T, E>) -> Result<Response, BrowserApiProblem>
where
    T: Serialize,
    E: Into<BrowserApiProblem>,
{
    match result {
        Ok(value) => Ok(success_response(
            StatusCode::OK,
            SdkWorkResourceData { item: value },
        )),
        Err(error) => Err(error.into()),
    }
}

pub fn created_resource_json<T, E>(result: Result<T, E>) -> Result<Response, BrowserApiProblem>
where
    T: Serialize,
    E: Into<BrowserApiProblem>,
{
    match result {
        Ok(value) => Ok(success_response(
            StatusCode::CREATED,
            SdkWorkResourceData { item: value },
        )),
        Err(error) => Err(error.into()),
    }
}

pub fn ok_page_json<T, E>(result: Result<T, E>) -> Result<Response, BrowserApiProblem>
where
    T: Serialize,
    E: Into<BrowserApiProblem>,
{
    match result {
        Ok(value) => Ok(success_response(StatusCode::OK, value)),
        Err(error) => Err(error.into()),
    }
}

pub fn success_resource_response<T: Serialize>(value: T) -> Response {
    success_response(
        StatusCode::OK,
        SdkWorkResourceData { item: value },
    )
}

pub fn success_created_resource_response<T: Serialize>(value: T) -> Response {
    success_response(
        StatusCode::CREATED,
        SdkWorkResourceData { item: value },
    )
}

pub fn success_page_response<T: Serialize>(value: T) -> Response {
    success_response(StatusCode::OK, value)
}
