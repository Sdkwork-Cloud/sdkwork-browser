import type { AgentProviderDiagnostic } from './agent-provider-diagnostic';

export interface AgentRuntimeDiagnostics {
  schemaVersion: 'agent_runtime_diagnostics.v1';
  runtimeId: string;
  agentId: string;
  state: 'ready' | 'degraded' | 'failed';
  providerCount: number;
  capabilityCount: number;
  typedProviderCount: number;
  manifestOnlyProviderCount: number;
  missingRequiredCapabilities: string[];
  degradedCapabilities: string[];
  providerDiagnostics: AgentProviderDiagnostic[];
  runtimeMode: string;
}
