import { resolveRuntimeTransport, describeRuntimeTransport } from "./runtimeTransport.ts";

export type AgentChatTransport = "gateway" | "tauri";

export function resolveAgentChatTransport(): AgentChatTransport {
  return resolveRuntimeTransport();
}

export function describeAgentChatTransport(): string {
  return describeRuntimeTransport("chat");
}
