use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserCookie {
    pub id: Uuid,
    pub name: String,
    pub value: String,
    pub domain: String,
}

#[derive(Default)]
pub struct BrowserCookieService {
    cookies: Vec<BrowserCookie>,
}

impl BrowserCookieService {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set(&mut self, name: impl Into<String>, value: impl Into<String>, domain: impl Into<String>) {
        self.cookies.push(BrowserCookie {
            id: Uuid::new_v4(),
            name: name.into(),
            value: value.into(),
            domain: domain.into(),
        });
    }

    pub fn export_json(&self) -> String {
        serde_json::to_string(&self.cookies).unwrap_or_else(|_| "[]".into())
    }

    pub fn list(&self) -> &[BrowserCookie] {
        &self.cookies
    }
}
