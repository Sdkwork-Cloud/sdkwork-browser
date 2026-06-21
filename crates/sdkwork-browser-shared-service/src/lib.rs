//! Shared helpers for browser domain services using sdkwork-utils.

use uuid::Uuid;

/// Creates a new entity UUID using sdkwork-utils id generation.
pub fn new_entity_uuid() -> Uuid {
    Uuid::parse_str(&sdkwork_utils_rust::uuid())
        .expect("sdkwork-utils must emit a valid UUID string")
}

/// Creates a request correlation id for HTTP API envelopes.
pub fn new_request_id() -> String {
    sdkwork_utils_rust::uuid()
}

/// Normalizes user-provided text via sdkwork-utils string helpers.
pub fn normalize_text(value: &str) -> String {
    sdkwork_utils_rust::trim(value)
}

/// Returns true when the value is blank per sdkwork-utils semantics.
pub fn is_blank(value: Option<&str>) -> bool {
    sdkwork_utils_rust::is_blank(value)
}

/// Validates a navigation or download URL via sdkwork-utils.
pub fn is_valid_url(value: &str) -> bool {
    sdkwork_utils_rust::is_url(value)
}

/// Case-insensitive substring match for browser search surfaces.
pub fn text_matches_query(query: &str, haystack: &str) -> bool {
    let query = normalize_text(query);
    if query.is_empty() {
        return true;
    }
    haystack
        .to_lowercase()
        .contains(&query.to_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_valid_uuid() {
        assert!(!new_entity_uuid().is_nil());
    }

    #[test]
    fn matches_query_case_insensitive() {
        assert!(text_matches_query("browser", "SDKWork Browser Runtime"));
        assert!(!text_matches_query("missing", "SDKWork Browser Runtime"));
    }

    #[test]
    fn normalizes_and_validates_urls() {
        assert_eq!(normalize_text("  tab  "), "tab");
        assert!(is_blank(Some("   ")));
        assert!(is_valid_url("https://sdkwork.com"));
        assert!(!is_valid_url("not-a-url"));
    }

    #[test]
    fn request_id_is_uuid_string() {
        assert!(sdkwork_utils_rust::is_uuid(&new_request_id()));
    }
}
