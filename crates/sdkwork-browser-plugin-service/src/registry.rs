use sdkwork_browser_abstraction_service::BrowserPluginRegistry;
use sdkwork_browser_agent_service::BrowserAgentService;
use sdkwork_browser_mcp_service::BrowserMcpService;

pub fn bootstrap_default_plugins() -> BrowserPluginRegistry {
    let mut registry = BrowserPluginRegistry::new();
    registry.register(Box::new(BrowserAgentService::new()));
    registry.register(Box::new(BrowserMcpService::new()));
    registry
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_browser_abstraction_service::BrowserPluginKind;

    #[test]
    fn registers_agent_and_mcp_plugins() {
        let registry = bootstrap_default_plugins();
        assert_eq!(registry.list().len(), 2);
        assert_eq!(registry.count_by_kind(BrowserPluginKind::Agent), 1);
        assert_eq!(registry.count_by_kind(BrowserPluginKind::Mcp), 1);
    }
}
