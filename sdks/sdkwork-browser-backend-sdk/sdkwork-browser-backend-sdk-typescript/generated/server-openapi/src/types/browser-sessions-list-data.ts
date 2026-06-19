import type { AgentRuntimeDiagnostics } from './agent-runtime-diagnostics';
import type { BrowserOperatorSession } from './browser-operator-session';

export interface BrowserSessionsListData {
  sessions: BrowserOperatorSession[];
  agentDiagnostics: AgentRuntimeDiagnostics;
}
