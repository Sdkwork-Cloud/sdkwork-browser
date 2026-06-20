import type { BrowserEngineId } from "@sdkwork/browser-contracts";
import { BROWSER_ENGINE_IDS } from "@sdkwork/browser-contracts";
import { create } from "zustand";
import {
  autoGroupBrowserTabs,
  fetchBrowserPlatformSnapshot,
  fetchCefSurface,
  isBrowserDesktopHost,
  loadBrowserUrl,
  setActiveBrowserTab,
  switchBrowserEngine,
  type BrowserPlatformSnapshot,
  type BrowserTabSnapshot,
  type CefSurfaceSnapshot,
} from "../bridge/browserPlatformBridge.ts";
import { normalizeNavigationUrl, tabTitleFromUrl } from "../utils/navigationUrl.ts";

const MAX_CLOSED_TABS = 12;

interface BrowserShellState {
  engineId: BrowserEngineId;
  snapshot: BrowserPlatformSnapshot | null;
  /** Locally managed tabs (used when no backend snapshot provides tabs). */
  localTabs: BrowserTabSnapshot[];
  localActiveTabId: string | null;
  closedTabs: BrowserTabSnapshot[];
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
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  closeTabsToLeft: (tabId: string) => void;
  duplicateTab: (tabId: string) => void;
  togglePinTab: (tabId: string) => void;
  reloadTab: (tabId: string) => Promise<void>;
  reopenClosedTab: () => void;
  copyTabUrl: (tabId: string) => Promise<void>;
  updateTab: (tabId: string, patch: Partial<BrowserTabSnapshot>) => void;
  updateActiveTabFromContent: (patch: { url?: string; title?: string }) => void;
}

let tabCounter = 0;
function makeTabId(): string {
  tabCounter += 1;
  return `local-tab-${Date.now()}-${tabCounter}`;
}

function cloneTab(tab: BrowserTabSnapshot, id = makeTabId()): BrowserTabSnapshot {
  return {
    ...tab,
    id,
    pin_state: "unpinned",
  };
}

function sortTabsPinnedFirst(tabs: BrowserTabSnapshot[]): BrowserTabSnapshot[] {
  const pinned = tabs.filter((tab) => tab.pin_state === "pinned");
  const regular = tabs.filter((tab) => tab.pin_state !== "pinned");
  return [...pinned, ...regular];
}

function pushClosedTab(
  closedTabs: BrowserTabSnapshot[],
  tab: BrowserTabSnapshot,
): BrowserTabSnapshot[] {
  return [tab, ...closedTabs.filter((entry) => entry.id !== tab.id)].slice(0, MAX_CLOSED_TABS);
}

function ensureActiveTabId(
  tabs: BrowserTabSnapshot[],
  preferredId: string | null | undefined,
): string | null {
  if (tabs.length === 0) {
    return null;
  }
  if (preferredId && tabs.some((tab) => tab.id === preferredId)) {
    return preferredId;
  }
  return tabs[0]?.id ?? null;
}

function usesLocalTabChrome(): boolean {
  return isBrowserDesktopHost();
}

function applyTabListUpdate(
  state: BrowserShellState,
  nextTabs: BrowserTabSnapshot[],
  activeTabId: string | null,
  closedTabs: BrowserTabSnapshot[] = state.closedTabs,
): Partial<BrowserShellState> {
  const sortedTabs = sortTabsPinnedFirst(nextTabs);
  const nextActiveId = ensureActiveTabId(sortedTabs, activeTabId);

  if (!usesLocalTabChrome() && state.snapshot?.tabs?.length) {
    return {
      snapshot: {
        ...state.snapshot,
        tabs: sortedTabs,
        active_tab_id: nextActiveId,
      },
      closedTabs,
    };
  }

  return {
    localTabs: sortedTabs,
    localActiveTabId: nextActiveId,
    closedTabs,
  };
}

function removeTabs(
  state: BrowserShellState,
  tabId: string,
  predicate: (tab: BrowserTabSnapshot, index: number, tabs: BrowserTabSnapshot[]) => boolean,
  nextActiveId?: string | null,
): Partial<BrowserShellState> {
  const sourceTabs = getTabList(state);
  const activeId = getActiveTabId(state);

  const closing = sourceTabs.filter((tab, index, tabs) => predicate(tab, index, tabs));
  let remaining = sourceTabs.filter((tab, index, tabs) => !predicate(tab, index, tabs));

  if (remaining.length === 0) {
    const fallback = sourceTabs.find((tab) => tab.id === tabId) ?? sourceTabs[0];
    if (fallback) {
      remaining = [fallback];
    }
  }

  const closedTabs = closing.reduce(
    (stack, tab) => pushClosedTab(stack, tab),
    state.closedTabs,
  );

  return applyTabListUpdate(state, remaining, nextActiveId ?? activeId, closedTabs);
}

function applyActiveTabUrl(
  state: BrowserShellState,
  url: string,
): Partial<BrowserShellState> {
  const title = tabTitleFromUrl(url);

  if (!usesLocalTabChrome() && state.snapshot?.tabs?.length) {
    const activeId =
      state.snapshot.active_tab_id ?? state.snapshot.tabs[0]?.id ?? null;
    if (!activeId) {
      return {};
    }

    const tabs = state.snapshot.tabs.map((tab) =>
      tab.id === activeId ? { ...tab, url, title } : tab,
    );

    return {
      snapshot: {
        ...state.snapshot,
        tabs,
        active_tab_id: activeId,
      },
    };
  }

  const activeId = state.localActiveTabId ?? state.localTabs[0]?.id ?? null;
  if (!activeId) {
    return {};
  }

  const localTabs = state.localTabs.map((tab) =>
    tab.id === activeId ? { ...tab, url, title } : tab,
  );

  return {
    localTabs,
    localActiveTabId: activeId,
  };
}

export function selectShellTabs(state: BrowserShellState): BrowserTabSnapshot[] {
  return getTabList(state);
}

export function selectShellActiveTabId(state: BrowserShellState): string | null {
  return getActiveTabId(state) ?? getTabList(state)[0]?.id ?? null;
}

export function selectActiveTab(
  state: BrowserShellState,
): BrowserTabSnapshot | null {
  const tabs = getTabList(state);
  const activeId = getActiveTabId(state) ?? tabs[0]?.id ?? null;
  if (!activeId) {
    return null;
  }
  return tabs.find((tab) => tab.id === activeId) ?? null;
}

export function selectActiveTabUrl(state: BrowserShellState): string {
  return selectActiveTab(state)?.url ?? "";
}

const initialLocalTabId = makeTabId();

export const useBrowserShellStore = create<BrowserShellState>((set, get) => ({
  engineId: BROWSER_ENGINE_IDS.webview,
  snapshot: null,
  localTabs: [
    {
      id: initialLocalTabId,
      title: "New Tab",
      url: "",
      pin_state: "unpinned",
    },
  ],
  localActiveTabId: initialLocalTabId,
  closedTabs: [],
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
    const normalized = normalizeNavigationUrl(url);
    if (!normalized) {
      return;
    }

    set((state) => ({
      ...applyActiveTabUrl(state, normalized),
      loading: true,
      error: null,
    }));

    if (isBrowserDesktopHost()) {
      void loadBrowserUrl(normalized).catch(() => {
        // Agent/platform metadata is best-effort; the child webview owns real navigation.
      });
      set({ loading: false });
      return;
    }

    try {
      const snapshot = await loadBrowserUrl(normalized);
      if (snapshot) {
        set((state) => ({
          snapshot,
          loading: false,
          ...applyActiveTabUrl({ ...state, snapshot }, normalized),
        }));
      } else {
        set({ loading: false });
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
    set({ localActiveTabId: tabId });

    const state = get();
    if (usesLocalTabChrome() || !state.snapshot?.tabs?.length) {
      return;
    }

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
      ...applyTabListUpdate(state, [...getTabList(state), newTab], id),
    }));
    return id;
  },
  closeTab: (tabId) => {
    set((state) => {
      const sourceTabs = getTabList(state);
      const idx = sourceTabs.findIndex((tab) => tab.id === tabId);
      if (idx === -1) {
        return {};
      }

      const activeId = getActiveTabId(state);
      let nextActiveId = activeId;
      if (activeId === tabId) {
        const remainingPreview = sourceTabs.filter((tab) => tab.id !== tabId);
        nextActiveId = remainingPreview[Math.min(idx, remainingPreview.length - 1)]?.id ?? null;
      }

      return removeTabs(state, tabId, (tab) => tab.id === tabId, nextActiveId);
    });
  },
  closeOtherTabs: (tabId) => {
    set((state) =>
      removeTabs(
        state,
        tabId,
        (tab) => tab.id !== tabId && tab.pin_state !== "pinned",
        tabId,
      ),
    );
  },
  closeTabsToRight: (tabId) => {
    set((state) => {
      const sourceTabs = getTabList(state);
      const index = sourceTabs.findIndex((tab) => tab.id === tabId);
      if (index === -1) {
        return {};
      }
      return removeTabs(
        state,
        tabId,
        (tab, tabIndex) => tabIndex > index && tab.pin_state !== "pinned",
        tabId,
      );
    });
  },
  closeTabsToLeft: (tabId) => {
    set((state) => {
      const sourceTabs = getTabList(state);
      const index = sourceTabs.findIndex((tab) => tab.id === tabId);
      if (index === -1) {
        return {};
      }
      return removeTabs(
        state,
        tabId,
        (tab, tabIndex) => tabIndex < index && tab.pin_state !== "pinned",
        tabId,
      );
    });
  },
  duplicateTab: (tabId) => {
    const state = get();
    const sourceTabs = getTabList(state);
    const index = sourceTabs.findIndex((tab) => tab.id === tabId);
    const sourceTab = sourceTabs[index];
    if (!sourceTab) {
      return;
    }

    const duplicate = cloneTab(sourceTab);
    const nextTabs = [
      ...sourceTabs.slice(0, index + 1),
      duplicate,
      ...sourceTabs.slice(index + 1),
    ];

    set(applyTabListUpdate(state, nextTabs, duplicate.id));
    void get().setActiveTab(duplicate.id);
    if (duplicate.url) {
      void get().loadUrl(duplicate.url);
    }
  },
  togglePinTab: (tabId) => {
    set((state) => {
      const sourceTabs = getTabList(state);
      const target = sourceTabs.find((tab) => tab.id === tabId);
      if (!target) {
        return {};
      }

      const pinned = target.pin_state === "pinned";
      const updated = sourceTabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, pin_state: pinned ? "unpinned" : "pinned" }
          : tab,
      );

      return applyTabListUpdate(state, updated, tabId);
    });
  },
  reloadTab: async (tabId) => {
    const state = get();
    const tab = getTabList(state).find((entry) => entry.id === tabId);
    if (!tab?.url) {
      return;
    }
    await get().setActiveTab(tabId);
    await get().loadUrl(tab.url);
  },
  reopenClosedTab: () => {
    set((state) => {
      if (state.closedTabs.length === 0) {
        return {};
      }

      const [restored, ...remainingClosed] = state.closedTabs;
      const reopened = cloneTab(restored);
      const nextTabs = [...getTabList(state), reopened];

      return {
        ...applyTabListUpdate(state, nextTabs, reopened.id),
        closedTabs: remainingClosed,
      };
    });

    const reopened = getTabList(get()).at(-1);
    if (reopened?.url) {
      void get().setActiveTab(reopened.id);
      void get().loadUrl(reopened.url);
    } else if (reopened) {
      void get().setActiveTab(reopened.id);
    }
  },
  copyTabUrl: async (tabId) => {
    const tab = getTabList(get()).find((entry) => entry.id === tabId);
    if (!tab?.url || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(tab.url);
  },
  updateTab: (tabId, patch) => {
    set((state) => {
      const sourceTabs = getTabList(state).map((tab) =>
        tab.id === tabId ? { ...tab, ...patch } : tab,
      );
      return applyTabListUpdate(state, sourceTabs, getActiveTabId(state));
    });
  },
  updateActiveTabFromContent: (patch) => {
    set((state) => {
      const activeId = getActiveTabId(state) ?? getTabList(state)[0]?.id ?? null;
      if (!activeId) {
        return {};
      }

      const sourceTabs = getTabList(state).map((tab) => {
        if (tab.id !== activeId) {
          return tab;
        }
        return {
          ...tab,
          ...(patch.url !== undefined ? { url: patch.url } : {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
        };
      });

      return applyTabListUpdate(state, sourceTabs, activeId);
    });
  },
}));

function getTabList(state: BrowserShellState): BrowserTabSnapshot[] {
  if (usesLocalTabChrome()) {
    return state.localTabs;
  }
  return state.snapshot?.tabs?.length ? state.snapshot.tabs : state.localTabs;
}

function getActiveTabId(state: BrowserShellState): string | null {
  if (usesLocalTabChrome()) {
    return state.localActiveTabId;
  }
  return state.snapshot?.tabs?.length
    ? state.snapshot.active_tab_id ?? null
    : state.localActiveTabId;
}
