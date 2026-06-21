export type RuntimeTransport = "gateway" | "tauri";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function resolveRuntimeTransport(): RuntimeTransport {
  if (isTauriRuntime()) {
    return "tauri";
  }

  const configured = import.meta.env.VITE_BROWSER_RUNTIME_TRANSPORT
    ?? import.meta.env.VITE_BROWSER_AGENT_CHAT_TRANSPORT;
  if (configured === "tauri") {
    return "tauri";
  }
  if (configured === "gateway") {
    return "gateway";
  }
  return "gateway";
}

export function describeRuntimeTransport(kind: "chat" | "platform" = "platform"): string {
  const transport = resolveRuntimeTransport();
  if (transport === "gateway") {
    return kind === "chat" ? "Gateway SSE" : "Gateway API";
  }
  return "Tauri host";
}
