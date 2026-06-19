import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import { useAgentStore } from "../stores/agentStore.ts";
import { AiChatSidebar } from "./AiChatSidebar.tsx";
import { CommandPalette } from "./CommandPalette.tsx";

interface BookmarkLink {
  name: string;
  url: string;
  letter: string;
  color: string;
}

const BOOKMARKS: BookmarkLink[] = [
  { name: "Google", url: "https://www.google.com", letter: "G", color: "#4285f4" },
  { name: "YouTube", url: "https://www.youtube.com", letter: "Y", color: "#ff0000" },
  { name: "GitHub", url: "https://github.com", letter: "G", color: "#24292e" },
  { name: "Gmail", url: "https://mail.google.com", letter: "G", color: "#ea4335" },
  { name: "Maps", url: "https://maps.google.com", letter: "M", color: "#34a853" },
  { name: "Wikipedia", url: "https://www.wikipedia.org", letter: "W", color: "#636363" },
  { name: "Bing", url: "https://www.bing.com", letter: "B", color: "#0078d4" },
  { name: "Baidu", url: "https://www.baidu.com", letter: "B", color: "#2932e1" },
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
  const snapshot = useBrowserShellStore((s) => s.snapshot);
  const localTabs = useBrowserShellStore((s) => s.localTabs);
  const localActiveTabId = useBrowserShellStore((s) => s.localActiveTabId);
  const loadUrl = useBrowserShellStore((s) => s.loadUrl);
  const createTab = useBrowserShellStore((s) => s.createTab);
  const closeTab = useBrowserShellStore((s) => s.closeTab);
  const setActiveTab = useBrowserShellStore((s) => s.setActiveTab);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setAgentOpen = useAgentStore((s) => s.setOpen);

  const [omniboxValue, setOmniboxValue] = useState("");
  const [omniboxFocused, setOmniboxFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Use backend tabs if available, otherwise local tabs
  const backendTabs = snapshot?.tabs ?? [];
  const useLocalTabs = backendTabs.length === 0 || !snapshot;
  const tabs = useLocalTabs ? localTabs : backendTabs;
  const activeTabId = useLocalTabs
    ? (localActiveTabId ?? localTabs[0]?.id ?? null)
    : (snapshot?.active_tab_id ?? null);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Sync omnibox with active tab URL (only when not focused)
  useEffect(() => {
    if (!omniboxFocused) {
      setOmniboxValue(activeTab?.url ?? "");
    }
  }, [activeTab?.url, omniboxFocused]);

  function handleOmniboxSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = omniboxValue.trim();
    if (!trimmed) return;
    let target = trimmed;
    if (!/^https?:\/\//i.test(target) && /^[\w-]+(\.[\w-]+)+/.test(target)) {
      target = `https://${target}`;
    } else if (!/^https?:\/\//i.test(target)) {
      target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    }
    void loadUrl(target);
    setOmniboxFocused(false);
    (document.activeElement as HTMLElement)?.blur();
  }

  function handleNewTab() {
    createTab();
    setOmniboxValue("");
  }

  function handleCloseTab(e: React.MouseEvent, tabId: string) {
    e.stopPropagation();
    closeTab(tabId);
  }

  function handleTabClick(tabId: string) {
    void setActiveTab(tabId);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {/* === Tab bar === */}
      <div className="tabbar">
        <div className="tabbar-inner">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const color = faviconColor(tab.url);
            const letter = faviconLetter(tab.title || tab.url);
            return (
              <div
                key={tab.id}
                className={`browser-tab ${isActive ? "browser-tab-active" : ""}`}
                onClick={() => handleTabClick(tab.id)}
              >
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
            onClick={handleNewTab}
            title="New tab (Ctrl+T)"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* === Navigation toolbar === */}
      <div className="nav-toolbar">
        {/* Back */}
        <button type="button" className="toolbar-btn" disabled title="Back (Alt+←)">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        {/* Forward */}
        <button type="button" className="toolbar-btn" disabled title="Forward (Alt+→)">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        {/* Reload */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => activeTab?.url ? void loadUrl(activeTab.url) : window.location.reload()}
          title="Reload (Ctrl+R)"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        {/* Home */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => {
            handleNewTab();
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
          className={`omnibox ${omniboxFocused ? "omnibox-focused" : ""}`}
          onSubmit={handleOmniboxSubmit}
        >
          <span className="omnibox-security">
            {activeTab?.url && activeTab.url.startsWith("https") ? (
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
        <div className="relative">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setMenuOpen((v) => !v)}
            title="Menu"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="glass-strong absolute right-0 top-9 z-50 w-56 rounded-xl border border-hairline shadow-xl animate-scale-in py-1.5">
                <MenuButtonItem label="New tab" shortcut="Ctrl+T" onClick={() => { handleNewTab(); setMenuOpen(false); }} />
                <MenuButtonItem label="New window" shortcut="Ctrl+N" onClick={() => setMenuOpen(false)} />
                <MenuButtonItem label="History" shortcut="Ctrl+H" onClick={() => setMenuOpen(false)} />
                <MenuButtonItem label="Downloads" shortcut="Ctrl+J" onClick={() => setMenuOpen(false)} />
                <MenuButtonItem label="Bookmarks" shortcut="Ctrl+Shift+O" onClick={() => setMenuOpen(false)} />
                <div className="my-1.5 h-px bg-hairline" />
                <MenuButtonItem label="Zoom" shortcut="100%" onClick={() => setMenuOpen(false)} />
                <MenuButtonItem label="Print" shortcut="Ctrl+P" onClick={() => setMenuOpen(false)} />
                <MenuButtonItem label="Find" shortcut="Ctrl+F" onClick={() => setMenuOpen(false)} />
                <div className="my-1.5 h-px bg-hairline" />
                <MenuButtonItem label="Settings" onClick={() => setMenuOpen(false)} />
                <MenuButtonItem label="Help" onClick={() => setMenuOpen(false)} />
                <div className="my-1.5 h-px bg-hairline" />
                <MenuButtonItem label="Exit" onClick={() => setMenuOpen(false)} />
              </div>
            </>
          ) : null}
        </div>

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

      <AiChatSidebar />
      <CommandPalette />
    </div>
  );
}

function MenuButtonItem({
  label,
  shortcut,
  onClick,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 px-3.5 py-1.5 text-left text-[0.8125rem] text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink-primary"
    >
      <span>{label}</span>
      {shortcut ? <span className="text-[0.6875rem] text-ink-faint">{shortcut}</span> : null}
    </button>
  );
}
