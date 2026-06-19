use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct BrowserHostStatus {
    pub product: &'static str,
    pub host: &'static str,
    pub ai_enabled: bool,
    pub ready: bool,
}

pub fn browser_host_status() -> BrowserHostStatus {
    BrowserHostStatus {
        product: "sdkwork-browser",
        host: "tauri",
        ai_enabled: true,
        ready: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_ai_native_host() {
        let status = browser_host_status();
        assert_eq!(status.product, "sdkwork-browser");
        assert!(status.ai_enabled);
        assert!(status.ready);
    }
}
