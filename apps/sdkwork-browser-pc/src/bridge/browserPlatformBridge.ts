import type { BrowserEngineId } from "@sdkwork/browser-contracts";
import {
  executeGatewayAiAction,
  fetchGatewayPlatformSnapshot,
  groupGatewayTabs,
  invokeGatewayMcpTool,
  listGatewayMcpTools,
  navigateGatewayUrl,
  shouldPreferGatewayPlatform,
} from "@sdkwork/browser-pc-core";
import type { GatewayPlatformSnapshot } from "@sdkwork/browser-pc-core";

export interface BrowserTabSnapshot {
  id: string;
  title: string;
  url: string;
  pin_state: string;
  group_id?: string | null;
}

export interface McpConnectorSnapshot {
  id: string;
  display_name: string;
}

export interface BrowserPlatformSnapshot {
  configured_engine: string;
  active_engine_id: string | null;
  engine_started: boolean;
  active_tab_id?: string | null;
  agent_runtime_id?: string;
  mcp_connectors?: McpConnectorSnapshot[];
  tabs: BrowserTabSnapshot[];
}

export interface CefSurfaceSnapshot {
  binding: string;
  embed_state: string;
  parent_window_label: string;
  width: number;
  height: number;
  message: string;
}

export interface BrowserPageContext {
  tabId?: string | null;
  url: string;
  title: string;
  htmlExcerpt: string;
  visibleText?: string;
  metaDescription?: string | null;
  wordCountEstimate: number;
  engineId?: string | null;
}

export interface BrowserAiActionRequest {
  action: string;
  targetUrl?: string;
  tabId?: string;
  message?: string;
  engineId?: string;
}

export interface BrowserAiActionResult {
  code: string;
  message: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface BrowserAgentChatRequest {
  message: string;
  tabId?: string;
}

export interface BrowserAgentChatMessage {
  role: string;
  content: string;
  action?: string;
}

export interface BrowserAgentChatResponse {
  code: string;
  reply: BrowserAgentChatMessage;
  suggestedActions?: string[];
  data?: Record<string, unknown>;
}

export interface TabGroupSuggestion {
  tabId: string;
  groupId: string;
  label: string;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(command, payload);
}

function fromGatewaySnapshot(snapshot: GatewayPlatformSnapshot): BrowserPlatformSnapshot {
  return snapshot;
}

export async function fetchBrowserPlatformSnapshot(): Promise<BrowserPlatformSnapshot | null> {
  if (shouldPreferGatewayPlatform()) {
    try {
      const snapshot = await fetchGatewayPlatformSnapshot();
      return snapshot ? fromGatewaySnapshot(snapshot) : null;
    } catch {
      // In web preview mode, the Gateway may not be running. Don't throw —
      // return null so the app can proceed with local tab management.
      if (!isTauriRuntime()) {
        return null;
      }
    }
  }

  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<BrowserPlatformSnapshot>("browser_platform_snapshot");
}

export async function startBrowserEngine(): Promise<BrowserPlatformSnapshot | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<BrowserPlatformSnapshot>("browser_start_engine");
}

export async function loadBrowserUrl(url: string): Promise<BrowserPlatformSnapshot | null> {
  if (shouldPreferGatewayPlatform()) {
    try {
      const snapshot = await navigateGatewayUrl(url);
      return snapshot ? fromGatewaySnapshot(snapshot) : null;
    } catch {
      // In web preview mode, the Gateway may not be running. Don't throw —
      // return null so the caller (loadUrl) can proceed without a snapshot.
      // The iframe in BrowserContentPanel handles the actual page navigation.
      if (!isTauriRuntime()) {
        return null;
      }
    }
  }

  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<BrowserPlatformSnapshot>("browser_load_url", { url });
}

export async function switchBrowserEngine(
  engine: BrowserEngineId,
): Promise<BrowserPlatformSnapshot | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<BrowserPlatformSnapshot>("browser_switch_engine", { engine });
}

export async function fetchCefSurface(): Promise<CefSurfaceSnapshot | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<CefSurfaceSnapshot | null>("browser_cef_surface");
}

function readWebPageContext(): BrowserPageContext | null {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }
  // In web preview mode, the browsed page is in a cross-origin iframe.
  // Reading document.body/outerHTML here returns the host app's DOM, not the
  // page content — which would give the AI completely wrong context.
  // Return null; same-origin iframe content is synced via syncLiveHtml instead.
  if (!isTauriRuntime()) {
    return null;
  }
  const visibleText = document.body?.innerText ?? "";
  const words = visibleText.trim().split(/\s+/).filter(Boolean);
  return {
    url: window.location.href,
    title: document.title || window.location.hostname,
    htmlExcerpt: document.documentElement.outerHTML.slice(0, 4000),
    visibleText: visibleText.slice(0, 4000),
    wordCountEstimate: words.length,
    engineId: null,
  };
}

export async function fetchPageContext(): Promise<BrowserPageContext | null> {
  if (isTauriRuntime()) {
    return invoke<BrowserPageContext>("browser_page_context");
  }
  return readWebPageContext();
}

export async function executeBrowserAiAction(
  request: BrowserAiActionRequest,
): Promise<BrowserAiActionResult | null> {
  if (shouldPreferGatewayPlatform()) {
    try {
      return await executeGatewayAiAction(request);
    } catch (error) {
      if (!isTauriRuntime()) {
        throw error;
      }
    }
  }

  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<BrowserAiActionResult>("browser_agent_execute", { request });
}

export async function sendBrowserAgentChat(
  request: BrowserAgentChatRequest,
): Promise<BrowserAgentChatResponse | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<BrowserAgentChatResponse>("browser_agent_chat", { request });
}

export async function autoGroupBrowserTabs(): Promise<{
  snapshot: BrowserPlatformSnapshot;
  suggestions: TabGroupSuggestion[];
} | null> {
  if (shouldPreferGatewayPlatform()) {
    try {
      const snapshot = await groupGatewayTabs();
      if (!snapshot) {
        return null;
      }
      return { snapshot: fromGatewaySnapshot(snapshot), suggestions: [] };
    } catch (error) {
      if (!isTauriRuntime()) {
        throw error;
      }
    }
  }

  if (!isTauriRuntime()) {
    return null;
  }

  const result = await invoke<[BrowserPlatformSnapshot, TabGroupSuggestion[]]>(
    "browser_group_tabs",
  );

  return { snapshot: result[0], suggestions: result[1] };
}

export async function setActiveBrowserTab(
  tabId: string,
): Promise<BrowserPlatformSnapshot | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<BrowserPlatformSnapshot>("browser_set_active_tab", { tabId });
}

export function isBrowserDesktopHost(): boolean {
  return isTauriRuntime();
}

export interface McpToolDescriptor {
  connectorId: string;
  name: string;
  description: string;
}

export interface McpToolInvokeRequest {
  connectorId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface McpToolInvokeResult {
  code: string;
  connectorId: string;
  toolName: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface BrowserAgentChatStreamResponse {
  code: string;
  chunks: string[];
  reply: BrowserAgentChatMessage;
  suggestedActions?: string[];
}

export interface ContentWebviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function mountContentWebview(bounds: ContentWebviewBounds): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("browser_content_mount", { bounds });
}

export async function navigateContentWebview(
  url: string,
): Promise<BrowserPlatformSnapshot | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<BrowserPlatformSnapshot>("browser_content_navigate", { url });
}

export async function openContentWebview(
  url: string,
  bounds: ContentWebviewBounds,
): Promise<BrowserPlatformSnapshot | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<BrowserPlatformSnapshot>("browser_content_open", { url, bounds });
}

export async function hideContentWebview(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("browser_content_hide");
}

export async function reloadContentWebview(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("browser_content_reload");
}

export async function captureContentDom(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("browser_content_capture");
}

export async function syncLiveHtml(html: string | null): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("browser_sync_live_html", { html });
}

export async function sendBrowserAgentChatStream(
  request: BrowserAgentChatRequest,
): Promise<BrowserAgentChatStreamResponse | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<BrowserAgentChatStreamResponse>("browser_agent_chat_stream", { request });
}

export async function listMcpTools(): Promise<McpToolDescriptor[] | null> {
  if (shouldPreferGatewayPlatform()) {
    try {
      return await listGatewayMcpTools();
    } catch (error) {
      if (!isTauriRuntime()) {
        throw error;
      }
    }
  }
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<McpToolDescriptor[]>("browser_mcp_list_tools");
}

export async function invokeMcpTool(
  request: McpToolInvokeRequest,
): Promise<McpToolInvokeResult | null> {
  if (shouldPreferGatewayPlatform()) {
    try {
      return await invokeGatewayMcpTool(request);
    } catch (error) {
      if (!isTauriRuntime()) {
        throw error;
      }
    }
  }
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<McpToolInvokeResult>("browser_mcp_invoke", { request });
}
