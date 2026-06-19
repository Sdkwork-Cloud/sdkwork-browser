//! Shared helpers for browser domain services using sdkwork-utils.

use uuid::Uuid;

/// Creates a new entity UUID using sdkwork-utils id generation.
pub fn new_entity_uuid() -> Uuid {
    Uuid::parse_str(&sdkwork_utils_rust::uuid())
        .expect("sdkwork-utils must emit a valid UUID string")
}

/// Case-insensitive substring match for browser search surfaces.
pub fn text_matches_query(query: &str, haystack: &str) -> bool {
    let query = query.trim();
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
}
