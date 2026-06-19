import type { AgentRuntimeDiagnostics } from './agent-runtime-diagnostics';
import type { BrowserOperatorSession } from './browser-operator-session';

export interface BrowserSessionsListResult {
  code: string;
  message: string;
  requestId: string;
  data: Record<string, unknown>;
}
