import { useMemo } from "react";
import type { BrowserTabSnapshot } from "../bridge/browserPlatformBridge.ts";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from "./ContextMenu.tsx";

export interface TabContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

interface TabContextMenuProps {
  state: TabContextMenuState | null;
  tabs: BrowserTabSnapshot[];
  onClose: () => void;
}

export function TabContextMenu({ state, tabs, onClose }: TabContextMenuProps) {
  const reloadTab = useBrowserShellStore((s) => s.reloadTab);
  const duplicateTab = useBrowserShellStore((s) => s.duplicateTab);
  const togglePinTab = useBrowserShellStore((s) => s.togglePinTab);
  const closeTab = useBrowserShellStore((s) => s.closeTab);
  const closeOtherTabs = useBrowserShellStore((s) => s.closeOtherTabs);
  const closeTabsToRight = useBrowserShellStore((s) => s.closeTabsToRight);
  const closeTabsToLeft = useBrowserShellStore((s) => s.closeTabsToLeft);
  const copyTabUrl = useBrowserShellStore((s) => s.copyTabUrl);
  const reopenClosedTab = useBrowserShellStore((s) => s.reopenClosedTab);
  const closedTabs = useBrowserShellStore((s) => s.closedTabs);

  const tab = useMemo(
    () => (state ? tabs.find((entry) => entry.id === state.tabId) ?? null : null),
    [state, tabs],
  );

  const tabIndex = useMemo(
    () => (tab ? tabs.findIndex((entry) => entry.id === tab.id) : -1),
    [tab, tabs],
  );

  const tabId = state?.tabId ?? "";
  const pinned = tab?.pin_state === "pinned";
  const hasUrl = Boolean(tab?.url);
  const canCloseLeft = tabIndex > 0;
  const canCloseRight = tabIndex >= 0 && tabIndex < tabs.length - 1;
  const canCloseOthers = tabs.length > 1;
  const canReopen = closedTabs.length > 0;
  const hasTab = Boolean(tab);

  function run(action: () => void | Promise<void>) {
    void action();
    onClose();
  }

  return (
    <ContextMenu
      open={Boolean(state)}
      x={state?.x ?? 0}
      y={state?.y ?? 0}
      onClose={onClose}
      label="Tab context menu"
    >
      <ContextMenuItem
        label="Reload"
        shortcut="Ctrl+R"
        disabled={!hasTab || !hasUrl}
        onClick={() => run(() => reloadTab(tabId))}
      />
      <ContextMenuItem
        label="Duplicate"
        disabled={!hasTab}
        onClick={() => run(() => duplicateTab(tabId))}
      />
      <ContextMenuItem
        label={pinned ? "Unpin" : "Pin"}
        disabled={!hasTab}
        onClick={() => run(() => togglePinTab(tabId))}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Close tab"
        shortcut="Ctrl+W"
        disabled={!hasTab}
        onClick={() => run(() => closeTab(tabId))}
      />
      <ContextMenuItem
        label="Close other tabs"
        disabled={!hasTab || !canCloseOthers}
        onClick={() => run(() => closeOtherTabs(tabId))}
      />
      <ContextMenuItem
        label="Close tabs to the right"
        disabled={!hasTab || !canCloseRight}
        onClick={() => run(() => closeTabsToRight(tabId))}
      />
      <ContextMenuItem
        label="Close tabs to the left"
        disabled={!hasTab || !canCloseLeft}
        onClick={() => run(() => closeTabsToLeft(tabId))}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Reopen closed tab"
        shortcut="Ctrl+Shift+T"
        disabled={!canReopen}
        onClick={() => run(() => reopenClosedTab())}
      />
      <ContextMenuItem
        label="Copy link"
        onClick={() => run(() => copyTabUrl(tabId))}
        disabled={!hasTab || !hasUrl}
      />
    </ContextMenu>
  );
}
