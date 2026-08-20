export interface AgentProviderDiagnostic {
  providerId: string;
  providerFamily: string;
  providerVersion: string;
  typedRegistered: boolean;
  health?: { status?: string; };
  capabilities: string[];
}
