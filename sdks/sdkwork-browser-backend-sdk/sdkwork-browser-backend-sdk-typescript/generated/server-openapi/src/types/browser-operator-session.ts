export interface BrowserOperatorSession {
  sessionId: string;
  kind: string;
  activeEngineId?: string | null;
  activeTabId?: string | null;
  tabCount: number;
  agentRuntimeId: string;
  runtimeMode: string;
  mcpConnectorCount: number;
  observedAtUnix: number;
}
