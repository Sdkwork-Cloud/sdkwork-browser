import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";
import { isolateFromDragRegion } from "../utils/tauriDragRegion.ts";
import { useBrowserShellStore, selectActiveTabUrl, selectShellTabs, selectShellActiveTabId } from "../stores/browserShellStore.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import { useAgentStore } from "../stores/agentStore.ts";
import { normalizeNavigationUrl } from "../utils/navigationUrl.ts";
import { AiChatSidebar } from "./AiChatSidebar.tsx";
import { CommandPalette } from "./CommandPalette.tsx";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "./ContextMenu.tsx";
import { TabContextMenu, type TabContextMenuState } from "./TabContextMenu.tsx";
import { WindowControls } from "./WindowControls.tsx";
import { useBrowserContentEvents } from "../hooks/useBrowserContentEvents.ts";

const VIEWPORT_PADDING = 8;

interface BookmarkLink {
  name: string;
  url: string;
  letter: string;
  color: string;
}

const BOOKMARKS: BookmarkLink[] = [
  { name: "Wikipedia", url: "https://www.wikipedia.org", letter: "W", color: "#636363" },
  { name: "MDN Docs", url: "https://developer.mozilla.org", letter: "M", color: "#000000" },
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org", letter: "O", color: "#7ebc6f" },
  { name: "Example", url: "https://example.com", letter: "E", color: "#4285f4" },
  { name: "GitHub", url: "https://github.com", letter: "G", color: "#24292e" },
  { name: "Google", url: "https://www.google.com", letter: "G", color: "#4285f4" },
  { name: "YouTube", url: "https://www.youtube.com", letter: "Y", color: "#ff0000" },
  { name: "Bing", url: "https://www.bing.com", letter: "B", color: "#0078d4" },
];

function faviconColor(url: string): string {
  if (!url) return "var(--color-surface-3)";
  try {
    const host = new URL(url).hostname;
    const colors = ["#4285f4", "#ea4335", "#34a853", "#fbbc05", "#ff6600", "#0078d4"];
    let hash = 0;
    for (let i = 0; i < host.length; i++) {
      hash = host.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  } catch {
    return "var(--color-surface-3)";
  }
}

function faviconLetter(title: string): string {
  const match = title.trim().match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "•";
}

export function ShellLayout({ children }: { children: ReactNode }) {
  useBrowserContentEvents();

  const tabs = useBrowserShellStore(selectShellTabs);
  const activeTabId = useBrowserShellStore(selectShellActiveTabId);
  const loadUrl = useBrowserShellStore((s) => s.loadUrl);
  const activeTabUrl = useBrowserShellStore(selectActiveTabUrl);
  const createTab = useBrowserShellStore((s) => s.createTab);
  const closeTab = useBrowserShellStore((s) => s.closeTab);
  const setActiveTab = useBrowserShellStore((s) => s.setActiveTab);
  const goBack = useBrowserShellStore((s) => s.goBack);
  const goForward = useBrowserShellStore((s) => s.goForward);
  const canGoBack = useBrowserShellStore((s) => s.canGoBack());
  const canGoForward = useBrowserShellStore((s) => s.canGoForward());
  const loading = useBrowserShellStore((s) => s.loading);
  const reopenClosedTab = useBrowserShellStore((s) => s.reopenClosedTab);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setAgentOpen = useAgentStore((s) => s.setOpen);
  const navigate = useNavigate();

  const [omniboxValue, setOmniboxValue] = useState("");
  const [omniboxFocused, setOmniboxFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [tabContextMenu, setTabContextMenu] = useState<TabContextMenuState | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const omniboxInputRef = useRef<HTMLInputElement>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  // Sync omnibox with active tab URL (only when not focused).
  useEffect(() => {
    if (!omniboxFocused) {
      setOmniboxValue(activeTabUrl);
    }
  }, [activeTabUrl, omniboxFocused]);

  // Global keyboard shortcuts — Chrome/Edge standard bindings
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const ctrl = event.ctrlKey || event.metaKey;
      const target = event.target as HTMLElement;
      const isInputFocused = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      // Ctrl+T — new tab
      if (ctrl && event.key === "t" && !event.shiftKey) {
        event.preventDefault();
        const id = createTab();
        setOmniboxValue("");
        requestAnimationFrame(() => omniboxInputRef.current?.focus());
        return;
      }
      // Ctrl+W — close tab
      if (ctrl && event.key === "w" && !event.shiftKey) {
        event.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        return;
      }
      // Ctrl+L — focus omnibox
      if (ctrl && event.key === "l") {
        event.preventDefault();
        omniboxInputRef.current?.focus();
        omniboxInputRef.current?.select();
        return;
      }
      // Ctrl+R / F5 — reload
      if ((ctrl && event.key === "r") || event.key === "F5") {
        event.preventDefault();
        if (activeTab?.url) void loadUrl(activeTab.url);
        return;
      }
      // Ctrl+Shift+T — reopen closed tab
      if (ctrl && event.shiftKey && event.key === "T") {
        event.preventDefault();
        reopenClosedTab();
        return;
      }
      // Alt+Left — back
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
        return;
      }
      // Alt+Right — forward
      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        goForward();
        return;
      }
      // Ctrl+1..8 — switch to tab N
      if (ctrl && event.key >= "1" && event.key <= "8" && !isInputFocused) {
        event.preventDefault();
        const idx = parseInt(event.key, 10) - 1;
        if (tabs[idx]) void setActiveTab(tabs[idx].id);
        return;
      }
      // Ctrl+9 — switch to last tab
      if (ctrl && event.key === "9" && !isInputFocused) {
        event.preventDefault();
        if (tabs.length > 0) void setActiveTab(tabs[tabs.length - 1].id);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, activeTab, createTab, closeTab, loadUrl, reopenClosedTab, goBack, goForward, tabs, setActiveTab]);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const button = menuButtonRef.current;
    if (!button) return;
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = menuRef.current?.getBoundingClientRect().width ?? 224;
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - VIEWPORT_PADDING,
    );
    setMenuPosition({ top: buttonRect.bottom + 4, left });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  function handleOmniboxSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = normalizeNavigationUrl(omniboxValue);
    if (!target) return;
    setOmniboxValue(target);
    setOmniboxFocused(false);
    void loadUrl(target);
    (document.activeElement as HTMLElement)?.blur();
  }

  function handleNewTab() {
    createTab();
    setOmniboxValue("");
    requestAnimationFrame(() => omniboxInputRef.current?.focus());
  }

  function handleCloseTab(e: React.MouseEvent, tabId: string) {
    e.stopPropagation();
    closeTab(tabId);
  }

  function handleTabClick(tabId: string) {
    void setActiveTab(tabId);
  }

  function handleTabContextMenu(event: React.MouseEvent, tabId: string) {
    event.preventDefault();
    event.stopPropagation();
    setTabContextMenu({ tabId, x: event.clientX, y: event.clientY });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <WindowControls />
      {/* === Tab bar (Chrome/Edge: tabs + drag region) === */}
      <div
        className={`tabbar${isBrowserDesktopHost() ? " tabbar-desktop" : ""}`}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className="tabbar-inner"
          role="tablist"
          aria-label="Browser tabs"
          data-tauri-drag-region="false"
          onPointerDown={isolateFromDragRegion}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const color = faviconColor(tab.url);
            const letter = faviconLetter(tab.title || tab.url);
            const isPinned = tab.pin_state === "pinned";
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`browser-tab ${isActive ? "browser-tab-active" : ""}${isPinned ? " browser-tab-pinned" : ""}`}
                data-tauri-drag-region="false"
                onPointerDown={isolateFromDragRegion}
                onClick={() => handleTabClick(tab.id)}
                onContextMenu={(event) => handleTabContextMenu(event, tab.id)}
              >
                {isActive ? (
                  <>
                    <span className="browser-tab-curve browser-tab-curve-left" aria-hidden="true" />
                    <span className="browser-tab-curve browser-tab-curve-right" aria-hidden="true" />
                  </>
                ) : null}
                <span
                  className="tab-favicon"
                  style={tab.url ? { background: color, color: "#fff" } : undefined}
                >
                  {tab.url ? letter : (
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                    </svg>
                  )}
                </span>
                <span className="tab-title">{tab.title || "New Tab"}</span>
                <button
                  type="button"
                  className="tab-close"
                  title="Close tab"
                  data-tauri-drag-region="false"
                  onPointerDown={isolateFromDragRegion}
                  onClick={(e) => handleCloseTab(e, tab.id)}
                >
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
          {/* New tab button */}
          <button
            type="button"
            className="tab-new-btn"
            data-tauri-drag-region="false"
            onPointerDown={isolateFromDragRegion}
            onClick={handleNewTab}
            title="New tab (Ctrl+T)"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        {isBrowserDesktopHost() ? (
          <div className="tabbar-drag" data-tauri-drag-region aria-hidden="true" />
        ) : null}
      </div>

      <TabContextMenu
        state={tabContextMenu}
        tabs={tabs}
        onClose={() => setTabContextMenu(null)}
      />

      {/* === Navigation toolbar === */}
      <div className="nav-toolbar">
        {/* Back */}
        <button
          type="button"
          className="toolbar-btn"
          disabled={!canGoBack}
          onClick={() => goBack()}
          title="Back (Alt+←)"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        {/* Forward */}
        <button
          type="button"
          className="toolbar-btn"
          disabled={!canGoForward}
          onClick={() => goForward()}
          title="Forward (Alt+→)"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        {/* Reload */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => { if (activeTab?.url) void loadUrl(activeTab.url); }}
          disabled={!activeTab?.url}
          title="Reload (Ctrl+R)"
        >
          <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        {/* Home — navigate current tab to new tab page */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => {
            // Navigate current tab to blank (shows NTP) instead of creating a new tab
            useBrowserShellStore.getState().updateActiveTabFromContent({ url: "", title: "New Tab" });
            setOmniboxValue("");
          }}
          title="Home"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12 12 3l9 9M5 10v10h4v-6h6v6h4V10" />
          </svg>
        </button>

        {/* Omnibox — fills all remaining space like Chrome/Edge */}
        <form
          className={`omnibox ${omniboxFocused ? "omnibox-focused" : ""} ${loading ? "omnibox-loading" : ""}`}
          onSubmit={handleOmniboxSubmit}
        >
          <span className="omnibox-security">
            {activeTab?.url && (() => {
              try { return new URL(activeTab.url).protocol === "https:"; } catch { return false; }
            })() ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ok" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-tertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            )}
          </span>
          <input
            ref={omniboxInputRef}
            className="omnibox-input"
            value={omniboxValue}
            onChange={(e) => setOmniboxValue(e.target.value)}
            onFocus={(e) => {
              setOmniboxFocused(true);
              e.currentTarget.select();
            }}
            onBlur={() => setOmniboxFocused(false)}
            placeholder="Search Google or type a URL"
            spellCheck={false}
            aria-label="Address and search bar"
          />
          {omniboxValue ? (
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-2 hover:text-ink-secondary"
              onMouseDown={(e) => { e.preventDefault(); setOmniboxValue(""); }}
              title="Clear"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </form>

        {/* Right-side actions */}
        <button type="button" className="toolbar-btn" title="Bookmark this page">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setAgentOpen(true)}
          title="AI Assistant"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 6 0 3 3 0 0 0 3-3 3 3 0 0 0 0-6V9a3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z" />
          </svg>
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>

        {/* Menu (three dots) */}
        <button
          ref={menuButtonRef}
          type="button"
          className="toolbar-btn"
          onClick={() => setMenuOpen((v) => !v)}
          title="Menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>

        {/* Avatar */}
        <button type="button" className="toolbar-btn !rounded-full ml-0.5" title="Account">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-ai text-[0.625rem] font-bold text-white">
            S
          </span>
        </button>
      </div>

      {/* === Bookmark bar === */}
      <div className="bookmark-bar">
        {BOOKMARKS.map((bm) => (
          <button
            key={bm.url}
            type="button"
            className="bookmark-item"
            onClick={() => void loadUrl(bm.url)}
            title={bm.url}
          >
            <span className="bookmark-favicon" style={{ background: bm.color }}>
              {bm.letter}
            </span>
            {bm.name}
          </button>
        ))}
      </div>

      {/* === Main content area === */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {menuOpen ? (
        <>
          <div className="context-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div
            ref={menuRef}
            className="context-menu glass-strong w-56"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            role="menu"
            aria-label="Browser menu"
          >
            <ContextMenuItem label="New tab" shortcut="Ctrl+T" onClick={() => { handleNewTab(); setMenuOpen(false); }} />
            <ContextMenuItem label="New window" shortcut="Ctrl+N" onClick={() => setMenuOpen(false)} />
            <ContextMenuItem label="History" shortcut="Ctrl+H" onClick={() => setMenuOpen(false)} />
            <ContextMenuItem label="Downloads" shortcut="Ctrl+J" onClick={() => setMenuOpen(false)} />
            <ContextMenuItem label="Bookmarks" shortcut="Ctrl+Shift+O" onClick={() => setMenuOpen(false)} />
            <ContextMenuSeparator />
            <ContextMenuItem label="Zoom" shortcut="100%" onClick={() => setMenuOpen(false)} />
            <ContextMenuItem label="Print" shortcut="Ctrl+P" onClick={() => setMenuOpen(false)} />
            <ContextMenuItem label="Find" shortcut="Ctrl+F" onClick={() => setMenuOpen(false)} />
            <ContextMenuSeparator />
            <ContextMenuItem label="Settings" onClick={() => { navigate({ to: "/settings" }); setMenuOpen(false); }} />
            <ContextMenuItem label="Help" onClick={() => setMenuOpen(false)} />
            <ContextMenuSeparator />
            <ContextMenuItem label="Exit" onClick={() => setMenuOpen(false)} />
          </div>
        </>
      ) : null}

      <AiChatSidebar />
      <CommandPalette />
    </div>
  );
}
