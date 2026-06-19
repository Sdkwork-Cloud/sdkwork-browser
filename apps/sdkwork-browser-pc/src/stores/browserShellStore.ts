import type { BrowserEngineId } from "@sdkwork/browser-contracts";
import { BROWSER_ENGINE_IDS } from "@sdkwork/browser-contracts";
import { create } from "zustand";
import {
  autoGroupBrowserTabs,
  fetchBrowserPlatformSnapshot,
  fetchCefSurface,
  isBrowserDesktopHost,
  loadBrowserUrl,
  navigateContentWebview,
  setActiveBrowserTab,
  switchBrowserEngine,
  type BrowserPlatformSnapshot,
  type BrowserTabSnapshot,
  type CefSurfaceSnapshot,
} from "../bridge/browserPlatformBridge.ts";

interface BrowserShellState {
  engineId: BrowserEngineId;
  snapshot: BrowserPlatformSnapshot | null;
  /** Locally managed tabs (used when no backend snapshot provides tabs). */
  localTabs: BrowserTabSnapshot[];
  localActiveTabId: string | null;
  cefSurface: CefSurfaceSnapshot | null;
  loading: boolean;
  error: string | null;
  setEngineId: (engineId: BrowserEngineId) => void;
  refreshSnapshot: () => Promise<void>;
  refreshCefSurface: () => Promise<void>;
  switchEngine: (engineId: BrowserEngineId) => Promise<void>;
  loadUrl: (url: string) => Promise<void>;
  autoGroupTabs: () => Promise<void>;
  setActiveTab: (tabId: string) => Promise<void>;
  createTab: () => string;
  closeTab: (tabId: string) => void;
  updateTab: (tabId: string, patch: Partial<BrowserTabSnapshot>) => void;
}

let tabCounter = 0;
function makeTabId(): string {
  tabCounter += 1;
  return `local-tab-${Date.now()}-${tabCounter}`;
}

export const useBrowserShellStore = create<BrowserShellState>((set, get) => ({
  engineId: BROWSER_ENGINE_IDS.webview,
  snapshot: null,
  localTabs: [
    {
      id: makeTabId(),
      title: "New Tab",
      url: "",
      pin_state: "unpinned",
    },
  ],
  localActiveTabId: null,
  cefSurface: null,
  loading: false,
  error: null,
  setEngineId: (engineId) => set({ engineId }),
  refreshSnapshot: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchBrowserPlatformSnapshot();
      const engineId = (snapshot?.active_engine_id ??
        snapshot?.configured_engine ??
        get().engineId) as BrowserEngineId;
      set({ snapshot, engineId, loading: false });
      if (engineId === BROWSER_ENGINE_IDS.cef) {
        await get().refreshCefSurface();
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to read browser platform",
      });
    }
  },
  refreshCefSurface: async () => {
    const surface = await fetchCefSurface();
    set({ cefSurface: surface });
  },
  switchEngine: async (engineId) => {
    set({ loading: true, error: null, engineId });
    try {
      const snapshot = await switchBrowserEngine(engineId);
      set({
        snapshot,
        engineId: (snapshot?.active_engine_id ?? engineId) as BrowserEngineId,
        loading: false,
      });
      if (engineId === BROWSER_ENGINE_IDS.cef) {
        await get().refreshCefSurface();
      } else {
        set({ cefSurface: null });
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to switch browser engine",
      });
    }
  },
  loadUrl: async (url) => {
    const state = get();
    set({ loading: true, error: null });
    try {
      const snapshot = isBrowserDesktopHost()
        ? await navigateContentWebview(url)
        : await loadBrowserUrl(url);
      if (snapshot) {
        set({ snapshot, loading: false });
      } else {
        // Local mode — update the active local tab
        const activeId = state.localActiveTabId ?? state.localTabs[0]?.id;
        if (activeId) {
          let host = url;
          try {
            host = new URL(url).hostname || url;
          } catch {
            // keep raw
          }
          const updated = state.localTabs.map((t) =>
            t.id === activeId
              ? { ...t, url, title: host || "Loading…" }
              : t,
          );
          set({ localTabs: updated, loading: false });
        } else {
          set({ loading: false });
        }
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load URL",
      });
    }
  },
  autoGroupTabs: async () => {
    set({ loading: true, error: null });
    try {
      const result = await autoGroupBrowserTabs();
      if (result) {
        set({ snapshot: result.snapshot, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to group tabs",
      });
    }
  },
  setActiveTab: async (tabId) => {
    const state = get();
    // If backend tabs exist, delegate to backend
    if (state.snapshot?.tabs?.length && isBrowserDesktopHost()) {
      set({ loading: true, error: null });
      try {
        const snapshot = await setActiveBrowserTab(tabId);
        set({ snapshot, loading: false });
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to set active tab",
        });
      }
    } else {
      // Local mode — just track active
      set({ localActiveTabId: tabId });
    }
  },
  createTab: () => {
    const id = makeTabId();
    const newTab: BrowserTabSnapshot = {
      id,
      title: "New Tab",
      url: "",
      pin_state: "unpinned",
    };
    set((state) => ({
      localTabs: [...state.localTabs, newTab],
      localActiveTabId: id,
    }));
    return id;
  },
  closeTab: (tabId) => {
    set((state) => {
      const idx = state.localTabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return {};
      const remaining = state.localTabs.filter((t) => t.id !== tabId);
      // If closing the active tab, pick neighbor
      let activeId = state.localActiveTabId;
      if (activeId === tabId) {
        activeId = remaining[Math.min(idx, remaining.length - 1)]?.id ?? null;
      }
      // Ensure at least one tab remains
      if (remaining.length === 0) {
        const freshId = makeTabId();
        return {
          localTabs: [{ id: freshId, title: "New Tab", url: "", pin_state: "unpinned" }],
          localActiveTabId: freshId,
        };
      }
      return { localTabs: remaining, localActiveTabId: activeId };
    });
  },
  updateTab: (tabId, patch) => {
    set((state) => ({
      localTabs: state.localTabs.map((t) =>
        t.id === tabId ? { ...t, ...patch } : t,
      ),
    }));
  },
}));
