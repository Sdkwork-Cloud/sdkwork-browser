use serde_json::{json, Value};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LlmCompletion {
    pub content: String,
    pub model: String,
    pub endpoint: String,
}

pub fn complete_with_llm(user_message: &str, page_title: &str, page_url: &str) -> Result<LlmCompletion, String> {
    let endpoint = std::env::var("BROWSER_AGENT_LLM_URL")
        .map_err(|_| "BROWSER_AGENT_LLM_URL is not configured".to_string())?;
    let model = std::env::var("BROWSER_AGENT_LLM_MODEL").unwrap_or_else(|_| "sdkwork-browser".into());
    let api_key = std::env::var("BROWSER_AGENT_LLM_API_KEY").ok();

    let body = json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": format!(
                    "You are SDKWork Browser Agent. Current page title: {page_title}. Current URL: {page_url}. Reply concisely with actionable browsing help."
                ),
            },
            { "role": "user", "content": user_message },
        ],
    });

    let mut request = ureq::post(&endpoint).set("Content-Type", "application/json");
    if let Some(api_key) = api_key.as_deref() {
        request = request.set("Authorization", &format!("Bearer {api_key}"));
    }

    let response = request
        .send_json(body)
        .map_err(|error| format!("LLM request failed: {error}"))?;

    let status = response.status();
    if !(200..300).contains(&status) {
        return Err(format!(
            "LLM endpoint returned HTTP {status}: {}",
            response.into_string().unwrap_or_default()
        ));
    }

    let payload: Value = response
        .into_json()
        .map_err(|error| format!("LLM response was not JSON: {error}"))?;

    let content = extract_content(&payload)
        .ok_or_else(|| format!("LLM response missing content: {payload}"))?;

    Ok(LlmCompletion {
        content,
        model,
        endpoint,
    })
}

fn extract_content(payload: &Value) -> Option<String> {
    payload
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .or_else(|| payload.get("message").and_then(Value::as_str).map(str::to_owned))
        .or_else(|| payload.get("reply").and_then(Value::as_str).map(str::to_owned))
        .or_else(|| payload.get("content").and_then(Value::as_str).map(str::to_owned))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_openai_style_content() {
        let payload = json!({
            "choices": [{ "message": { "content": "Summarize the page." } }]
        });
        assert_eq!(
            extract_content(&payload).as_deref(),
            Some("Summarize the page.")
        );
    }

    #[test]
    fn extracts_simple_message_field() {
        let payload = json!({ "message": "Navigate to docs." });
        assert_eq!(
            extract_content(&payload).as_deref(),
            Some("Navigate to docs.")
        );
    }
}
