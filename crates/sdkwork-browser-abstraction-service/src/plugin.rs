use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrowserPluginKind {
    Agent,
    Mcp,
    Ai,
    Security,
    Developer,
}

pub trait BrowserPlugin: Send + Sync {
    fn id(&self) -> &str;
    fn kind(&self) -> BrowserPluginKind;
}

#[derive(Default)]
pub struct BrowserPluginRegistry {
    plugins: Vec<Box<dyn BrowserPlugin>>,
}

impl BrowserPluginRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register(&mut self, plugin: Box<dyn BrowserPlugin>) {
        self.plugins.push(plugin);
    }

    pub fn list(&self) -> &[Box<dyn BrowserPlugin>] {
        &self.plugins
    }

    pub fn count_by_kind(&self, kind: BrowserPluginKind) -> usize {
        self.plugins.iter().filter(|p| p.kind() == kind).count()
    }
}
