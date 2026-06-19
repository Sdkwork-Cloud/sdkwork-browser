export interface AgentProviderDiagnostic {
  providerId: string;
  providerFamily: string;
  providerVersion: string;
  typedRegistered: boolean;
  health?: Record<string, unknown>;
  capabilities: string[];
}
