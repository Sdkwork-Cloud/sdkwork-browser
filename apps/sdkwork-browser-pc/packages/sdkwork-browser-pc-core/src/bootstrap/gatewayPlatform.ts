import { createBrowserSdkClients } from "./sdkClients.ts";
import { resolveRuntimeTransport } from "./runtimeTransport.ts";

export interface GatewayAiActionRequest {
  action: string;
  targetUrl?: string;
  tabId?: string;
  message?: string;
  engineId?: string;
}

export interface GatewayAiActionResult {
  code: string;
  message: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface GatewayMcpToolDescriptor {
  connectorId: string;
  name: string;
  description: string;
}

export interface GatewayMcpToolInvokeRequest {
  connectorId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface GatewayMcpToolInvokeResult {
  code: string;
  connectorId: string;
  toolName: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface GatewayPlatformSnapshot {
  configured_engine: string;
  active_engine_id: string | null;
  engine_started: boolean;
  active_tab_id?: string | null;
  agent_runtime_id?: string;
  mcp_connectors?: { id: string; display_name: string }[];
  tabs: {
    id: string;
    title: string;
    url: string;
    pin_state: string;
    group_id?: string | null;
  }[];
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function shouldPreferGatewayPlatform(): boolean {
  return resolveRuntimeTransport() === "gateway";
}

export async function executeGatewayAiAction(
  request: GatewayAiActionRequest,
): Promise<GatewayAiActionResult> {
  const clients = createBrowserSdkClients();
  const result = await clients.app.browser.aiActions.create({
    action: request.action,
    targetUrl: request.targetUrl,
    tabId: request.tabId,
    message: request.message,
    engineId: request.engineId,
  });

  return {
    code: result.code,
    message: result.message,
    action: request.action,
    data: readRecord(result.data) ?? undefined,
  };
}

export async function listGatewayMcpTools(): Promise<GatewayMcpToolDescriptor[]> {
  const clients = createBrowserSdkClients();
  const result = await clients.app.browser.aiActions.create({
    action: "mcpListTools",
  });
  const data = readRecord(result.data);
  const tools = data?.tools;
  if (!Array.isArray(tools)) {
    return [];
  }

  return tools.flatMap((entry) => {
    const row = readRecord(entry);
    if (!row || typeof row.name !== "string") {
      return [];
    }
    return [{
      connectorId: typeof row.connectorId === "string" ? row.connectorId : "unknown",
      name: row.name,
      description: typeof row.description === "string" ? row.description : "",
    }];
  });
}

export async function invokeGatewayMcpTool(
  request: GatewayMcpToolInvokeRequest,
): Promise<GatewayMcpToolInvokeResult> {
  const clients = createBrowserSdkClients();
  const result = await clients.app.browser.aiActions.create({
    action: "mcpInvoke",
    connectorId: request.connectorId,
    toolName: request.toolName,
    arguments: request.arguments ?? {},
  });

  const data = readRecord(result.data);
  return {
    code: result.code,
    connectorId: request.connectorId,
    toolName: request.toolName,
    message: result.message,
    data: data ?? undefined,
  };
}

export async function fetchGatewayPlatformSnapshot(
  payload?: { targetUrl?: string; engineId?: string },
): Promise<GatewayPlatformSnapshot | null> {
  const clients = createBrowserSdkClients();
  const result = await clients.app.browser.sessions.create({
    action: "bootstrap",
    targetUrl: payload?.targetUrl,
    engineId: payload?.engineId,
  });
  return mapGatewaySnapshot(result.data);
}

export async function navigateGatewayUrl(url: string): Promise<GatewayPlatformSnapshot | null> {
  const clients = createBrowserSdkClients();
  const result = await clients.app.browser.tabs.create({
    action: "navigate",
    targetUrl: url,
  });
  return mapGatewaySnapshot(result.data);
}

export async function groupGatewayTabs(): Promise<GatewayPlatformSnapshot | null> {
  await executeGatewayAiAction({ action: "groupTabs" });
  return fetchGatewayPlatformSnapshot();
}

export function mapGatewaySnapshot(data: unknown): GatewayPlatformSnapshot | null {
  const row = readRecord(data);
  if (!row) {
    return null;
  }

  const tabs = Array.isArray(row.tabs)
    ? row.tabs.flatMap((entry) => {
        const tab = readRecord(entry);
        if (!tab || typeof tab.id !== "string") {
          return [];
        }
        return [{
          id: tab.id,
          title: typeof tab.title === "string" ? tab.title : tab.id,
          url: typeof tab.url === "string" ? tab.url : "",
          pin_state: typeof tab.pin_state === "string" ? tab.pin_state : "none",
          group_id: typeof tab.group_id === "string" ? tab.group_id : null,
        }];
      })
    : [];

  const connectors = Array.isArray(row.mcp_connectors)
    ? row.mcp_connectors.flatMap((entry) => {
        const connector = readRecord(entry);
        if (!connector || typeof connector.id !== "string") {
          return [];
        }
        return [{
          id: connector.id,
          display_name:
            typeof connector.display_name === "string" ? connector.display_name : connector.id,
        }];
      })
    : Array.isArray(row.mcpConnectors)
      ? row.mcpConnectors.flatMap((entry) => {
          const connector = readRecord(entry);
          if (!connector || typeof connector.id !== "string") {
            return [];
          }
          return [{
            id: connector.id,
            display_name:
              typeof connector.displayName === "string"
                ? connector.displayName
                : connector.id,
          }];
        })
      : undefined;

  return {
    configured_engine:
      typeof row.configured_engine === "string"
        ? row.configured_engine
        : typeof row.configuredEngine === "string"
          ? row.configuredEngine
          : "webview",
    active_engine_id:
      typeof row.active_engine_id === "string"
        ? row.active_engine_id
        : typeof row.activeEngineId === "string"
          ? row.activeEngineId
          : null,
    engine_started: row.engine_started === true || row.engineStarted === true,
    active_tab_id:
      typeof row.active_tab_id === "string"
        ? row.active_tab_id
        : typeof row.activeTabId === "string"
          ? row.activeTabId
          : null,
    agent_runtime_id:
      typeof row.agent_runtime_id === "string"
        ? row.agent_runtime_id
        : typeof row.agentRuntimeId === "string"
          ? row.agentRuntimeId
          : undefined,
    mcp_connectors: connectors,
    tabs,
  };
}
