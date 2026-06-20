import type { BrowserEngineId } from "@sdkwork/browser-contracts";
import { BROWSER_ENGINE_IDS } from "@sdkwork/browser-contracts";
import { create } from "zustand";
import { persist } from "zustand/middleware";
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

/** Per-tab navigation history for back/forward support. */
interface HistoryEntry {
  url: string;
  title?: string;
}

interface TabHistory {
  entries: HistoryEntry[];
  index: number;
}

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
  /** Increments on every loadUrl call — forces iframe reload even for same URL. */
  reloadNonce: number;
  /** Navigation history per tab ID. */
  tabHistory: Record<string, TabHistory>;
  setEngineId: (engineId: BrowserEngineId) => void;
  refreshSnapshot: () => Promise<void>;
  refreshCefSurface: () => Promise<void>;
  switchEngine: (engineId: BrowserEngineId) => Promise<void>;
  loadUrl: (url: string, tabId?: string) => Promise<void>;
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
  goBack: () => void;
  goForward: () => void;
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
  // Always use local tabs for tab management — both in web preview and desktop
  // mode. The snapshot is only for engine metadata, not tab state. This avoids
  // confusion when the Gateway is intermittently available in web preview.
  return true;
}

// === History stack helpers ===

function getHistory(state: BrowserShellState, tabId: string | null): TabHistory {
  if (!tabId) return { entries: [], index: -1 };
  return state.tabHistory[tabId] ?? { entries: [], index: -1 };
}

function pushHistory(history: TabHistory, url: string, title?: string): TabHistory {
  // Truncate forward entries when navigating to a new URL
  const entries = history.entries.slice(0, history.index + 1);
  const last = entries[entries.length - 1];
  // Don't push duplicate consecutive entries
  if (last && last.url === url) {
    // Update title of existing entry if we now have one
    if (title && !last.title) {
      entries[entries.length - 1] = { ...last, title };
    }
    return { entries, index: entries.length - 1 };
  }
  entries.push({ url, title });
  return { entries, index: entries.length - 1 };
}

function updateHistoryTitle(history: TabHistory, title: string): TabHistory {
  if (history.index < 0 || !history.entries[history.index]) {
    return history;
  }
  const entries = history.entries.slice();
  entries[history.index] = { ...entries[history.index], title };
  return { ...history, entries };
}

function navigateHistory(history: TabHistory, delta: number): { history: TabHistory; url: string | null; title?: string } {
  const newIndex = history.index + delta;
  if (newIndex < 0 || newIndex >= history.entries.length) {
    return { history, url: null };
  }
  const entry = history.entries[newIndex];
  return { history: { ...history, index: newIndex }, url: entry.url, title: entry.title };
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

  // Clean up history for all closed tabs
  const closedIds = new Set(closing.map((tab) => tab.id));
  const cleanedHistory = Object.fromEntries(
    Object.entries(state.tabHistory).filter(([id]) => !closedIds.has(id)),
  );

  // When all tabs are closed, create a fresh empty tab — like Chrome/Edge.
  if (remaining.length === 0) {
    const newId = makeTabId();
    remaining = [{ id: newId, title: "New Tab", url: "", pin_state: "unpinned" }];
    return {
      ...applyTabListUpdate(
        state,
        remaining,
        newId,
        closing.reduce((stack, tab) => pushClosedTab(stack, tab), state.closedTabs),
      ),
      tabHistory: cleanedHistory,
    };
  }

  const closedTabs = closing.reduce(
    (stack, tab) => pushClosedTab(stack, tab),
    state.closedTabs,
  );

  return {
    ...applyTabListUpdate(state, remaining, nextActiveId ?? activeId, closedTabs),
    tabHistory: cleanedHistory,
  };
}

function applyActiveTabUrl(
  state: BrowserShellState,
  url: string,
  title?: string,
  tabId?: string,
): Partial<BrowserShellState> {
  const resolvedTitle = title ?? tabTitleFromUrl(url);

  if (!usesLocalTabChrome() && state.snapshot?.tabs?.length) {
    const activeId =
      tabId ??
      state.snapshot.active_tab_id ??
      state.snapshot.tabs[0]?.id ??
      null;
    if (!activeId) {
      return {};
    }

    const tabs = state.snapshot.tabs.map((tab) =>
      tab.id === activeId ? { ...tab, url, title: resolvedTitle } : tab,
    );

    return {
      snapshot: {
        ...state.snapshot,
        tabs,
        active_tab_id: activeId,
      },
    };
  }

  const activeId = tabId ?? state.localActiveTabId ?? state.localTabs[0]?.id ?? null;
  if (!activeId) {
    return {};
  }

  const localTabs = state.localTabs.map((tab) =>
    tab.id === activeId ? { ...tab, url, title: resolvedTitle } : tab,
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

export function selectCanGoBack(state: BrowserShellState): boolean {
  const activeId = getActiveTabId(state);
  if (!activeId) return false;
  const history = getHistory(state, activeId);
  return history.index > 0;
}

export function selectCanGoForward(state: BrowserShellState): boolean {
  const activeId = getActiveTabId(state);
  if (!activeId) return false;
  const history = getHistory(state, activeId);
  return history.index < history.entries.length - 1;
}

const initialLocalTabId = makeTabId();

export const useBrowserShellStore = create<BrowserShellState>()(
  persist(
    (set, get) => ({
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
  reloadNonce: 0,
  tabHistory: {},
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
      // In web preview mode, Gateway errors are expected — don't show them.
      // Only show errors in desktop mode where they indicate real problems.
      if (isBrowserDesktopHost()) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to read browser platform",
        });
      } else {
        set({ loading: false });
      }
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
  loadUrl: async (url, tabId) => {
    const normalized = normalizeNavigationUrl(url);
    if (!normalized) {
      return;
    }

    const activeId = tabId ?? getActiveTabId(get());
    set((state) => {
      const history = activeId ? pushHistory(getHistory(state, activeId), normalized) : null;
      return {
        ...applyActiveTabUrl(state, normalized, undefined, activeId ?? undefined),
        loading: true,
        error: null,
        reloadNonce: state.reloadNonce + 1,
        ...(history && activeId
          ? { tabHistory: { ...state.tabHistory, [activeId]: history } }
          : {}),
      };
    });

    // Both Tauri and web preview modes use the same non-blocking pattern.
    // loadBrowserUrl only updates platform metadata (agent/snapshot state) —
    // the actual webview/iframe navigation is owned by BrowserContentPanel's
    // useEffect, which fires independently when reloadNonce changes.
    // Blocking here would keep loading:true and freeze the omnibox/tab UI.
    void loadBrowserUrl(normalized)
      .then((snapshot) => {
        if (snapshot) {
          set((state) => ({
            snapshot,
            ...applyActiveTabUrl(
              { ...state, snapshot },
              normalized,
              undefined,
              activeId ?? undefined,
            ),
          }));
        }
      })
      .catch(() => {
        // Best-effort: ignore network/IPC errors — the webview owns navigation.
      })
      .finally(() => {
        set({ loading: false });
      });
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
    // Skip if already active — avoids spurious reloadNonce increment
    if (get().localActiveTabId === tabId) {
      return;
    }

    // Increment reloadNonce so BrowserContentPanel's useEffect treats the
    // URL change as an external navigation (driving the webview) rather than
    // an internal navigation (link click). Without this, switching tabs in
    // Tauri mode wouldn't navigate the child webview to the new tab's URL.
    set((state) => ({
      localActiveTabId: tabId,
      reloadNonce: state.reloadNonce + 1,
    }));

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

      // Clean up history for closed tab
      const { [tabId]: _removed, ...restHistory } = state.tabHistory;

      return {
        ...removeTabs(state, tabId, (tab) => tab.id === tabId, nextActiveId),
        tabHistory: restHistory,
      };
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
    // Await setActiveTab before loadUrl to avoid race condition.
    // Pass explicit tabId so loadUrl targets the duplicate, not whatever tab
    // happens to be active after the async gap.
    void get().setActiveTab(duplicate.id).then(() => {
      if (duplicate.url) {
        void get().loadUrl(duplicate.url, duplicate.id);
      }
    });
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
    // Pass explicit tabId to avoid race if user switches tabs during await
    await get().loadUrl(tab.url, tabId);
  },
  reopenClosedTab: () => {
    const state = get();
    if (state.closedTabs.length === 0) {
      return;
    }

    const [restored, ...remainingClosed] = state.closedTabs;
    const reopened = cloneTab(restored);
    const nextTabs = [...getTabList(state), reopened];

    set({
      ...applyTabListUpdate(state, nextTabs, reopened.id),
      closedTabs: remainingClosed,
    });

    // Await setActiveTab before loadUrl to avoid race condition.
    // Pass explicit tabId so loadUrl targets the reopened tab.
    void get().setActiveTab(reopened.id).then(() => {
      if (reopened.url) {
        void get().loadUrl(reopened.url, reopened.id);
      }
    });
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

      const currentTab = getTabList(state).find((tab) => tab.id === activeId);
      const urlChanged = patch.url !== undefined && patch.url !== currentTab?.url;

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

      // Push to history when URL changes from in-page navigation.
      // When only title changes (page loaded), update the current entry's title.
      // Note: empty URL ("") is NTP — still push to history so Back can return to it.
      let historyUpdate: Partial<Pick<BrowserShellState, "tabHistory">> = {};
      if (urlChanged && patch.url !== undefined) {
        historyUpdate = {
          tabHistory: {
            ...state.tabHistory,
            [activeId]: pushHistory(getHistory(state, activeId), patch.url, patch.title),
          },
        };
      } else if (patch.title && !urlChanged) {
        historyUpdate = {
          tabHistory: {
            ...state.tabHistory,
            [activeId]: updateHistoryTitle(getHistory(state, activeId), patch.title),
          },
        };
      }

      return {
        ...applyTabListUpdate(state, sourceTabs, activeId),
        ...historyUpdate,
      };
    });
  },
  goBack: () => {
    const state = get();
    const activeId = getActiveTabId(state);
    if (!activeId) return;

    const history = getHistory(state, activeId);
    const { history: newHistory, url, title } = navigateHistory(history, -1);
    if (url === null) return;

    set((s) => ({
      tabHistory: { ...s.tabHistory, [activeId]: newHistory },
      ...applyActiveTabUrl(s, url, title),
      loading: url !== "",
      error: null,
      reloadNonce: s.reloadNonce + 1,
    }));

    // Trigger platform-level navigation (skip for NTP / empty URL)
    if (url) {
      void loadBrowserUrl(url)
        .then((snapshot) => {
          set((s) => ({
            ...(snapshot ? { snapshot } : {}),
            loading: false,
            ...applyActiveTabUrl(s, url, title),
          }));
        })
        .catch(() => set({ loading: false }));
    } else {
      set({ loading: false });
    }
  },
  goForward: () => {
    const state = get();
    const activeId = getActiveTabId(state);
    if (!activeId) return;

    const history = getHistory(state, activeId);
    const { history: newHistory, url, title } = navigateHistory(history, 1);
    if (url === null) return;

    set((s) => ({
      tabHistory: { ...s.tabHistory, [activeId]: newHistory },
      ...applyActiveTabUrl(s, url, title),
      loading: url !== "",
      error: null,
      reloadNonce: s.reloadNonce + 1,
    }));

    // Trigger platform-level navigation (skip for NTP / empty URL)
    if (url) {
      void loadBrowserUrl(url)
        .then((snapshot) => {
          set((s) => ({
            ...(snapshot ? { snapshot } : {}),
            loading: false,
            ...applyActiveTabUrl(s, url, title),
          }));
        })
        .catch(() => set({ loading: false }));
    } else {
      set({ loading: false });
    }
  },
}),
    {
      name: "sdkwork-browser-shell",
      partialize: (state) => ({
        engineId: state.engineId,
        localTabs: state.localTabs,
        localActiveTabId: state.localActiveTabId,
        tabHistory: state.tabHistory,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Validate localActiveTabId — ensure it points to an existing tab
        if (state.localActiveTabId && !state.localTabs.some((t) => t.id === state.localActiveTabId)) {
          state.localActiveTabId = state.localTabs[0]?.id ?? null;
        }
        // Clean up orphaned tabHistory entries (tabs that no longer exist)
        const tabIds = new Set(state.localTabs.map((t) => t.id));
        const cleanedHistory = Object.fromEntries(
          Object.entries(state.tabHistory).filter(([id]) => tabIds.has(id)),
        );
        state.tabHistory = cleanedHistory;
      },
    },
  ),
);

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
