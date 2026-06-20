import { createBrowserShell } from "@sdkwork/browser-pc-react";
import { useEffect, useMemo, useState } from "react";
import { BrowserContentPanel } from "../components/BrowserContentPanel.tsx";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";
import { useAgentStore } from "../stores/agentStore.ts";
import { useBrowserShellStore, selectActiveTabUrl } from "../stores/browserShellStore.ts";
import { normalizeNavigationUrl } from "../utils/navigationUrl.ts";

interface QuickLink {
  name: string;
  url: string;
  letter: string;
  color: string;
}

const QUICK_LINKS: QuickLink[] = [
  { name: "Wikipedia", url: "https://www.wikipedia.org", letter: "W", color: "#636363" },
  { name: "MDN Docs", url: "https://developer.mozilla.org", letter: "M", color: "#000000" },
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org", letter: "O", color: "#7ebc6f" },
  { name: "Example", url: "https://example.com", letter: "E", color: "#4285f4" },
  { name: "GitHub", url: "https://github.com", letter: "G", color: "#24292e" },
  { name: "Google", url: "https://www.google.com", letter: "G", color: "#4285f4" },
  { name: "YouTube", url: "https://www.youtube.com", letter: "Y", color: "#ff0000" },
  { name: "Bing", url: "https://www.bing.com", letter: "B", color: "#0078d4" },
];

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatClock(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

export function HomePage() {
  // Memoize shell — only needed for tagline, don't recreate every render
  const shell = useMemo(() => createBrowserShell(), []);
  const loading = useBrowserShellStore((s) => s.loading);
  const error = useBrowserShellStore((s) => s.error);
  const reloadNonce = useBrowserShellStore((s) => s.reloadNonce);
  const refreshSnapshot = useBrowserShellStore((s) => s.refreshSnapshot);
  const loadUrl = useBrowserShellStore((s) => s.loadUrl);
  const setAgentOpen = useAgentStore((s) => s.setOpen);
  const activeTabUrl = useBrowserShellStore(selectActiveTabUrl);
  const activeTabId = useBrowserShellStore((s) => s.localActiveTabId);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  // Live clock — updates every second like Edge's NTP
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Greeting only depends on the hour, not the full Date — avoids recompute every second
  const greeting = useMemo(() => greetingForHour(now.getHours()), [now.getHours()]);

  // The active tab's URL drives what we show — just like a real browser.
  // Empty URL → new tab page; non-empty → browser content.
  const hasUrl = Boolean(activeTabUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = normalizeNavigationUrl(query);
    if (!target) return;
    void loadUrl(target, activeTabId ?? undefined);
  }

  function handleQuickLink(link: QuickLink) {
    setQuery(link.url);
    void loadUrl(link.url, activeTabId ?? undefined);
  }

  // Show browser content when the active tab has a URL
  if (hasUrl) {
    return (
      <div className="relative h-full">
        <BrowserContentPanel url={activeTabUrl} reloadNonce={reloadNonce} activeTabId={activeTabId} />
        {error ? (
          <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2.5 rounded-lg border border-err/30 bg-surface-1 px-4 py-2.5 text-[0.8125rem] text-err shadow-lg animate-slide-up">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  // New tab page — premium browser-grade composition (Edge/Chrome inspired)
  return (
    <div className="ntp">
      <div className="ntp-inner">
        {/* Live clock — Edge-style prominent time display */}
        <div className="ntp-clock-wrap animate-fade-in">
          <div className="ntp-clock">{formatClock(now)}</div>
          <div className="ntp-date">{formatDate(now)}</div>
        </div>

        {/* Brand mark — distinctive SDKWork identity */}
        <div className="ntp-brand animate-fade-in">
          <span className="ntp-brand-glow" />
          <span className="ntp-brand-mark">
            <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
              <path
                d="M16 3 5 9v7c0 6.2 4.5 11 11 13 6.5-2 11-6.8 11-13V9L16 3z"
                fill="#fff"
                fillOpacity="0.95"
              />
              <path
                d="M11 16.5l3.2 3.2L21 13"
                stroke="#1a56c4"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {/* Greeting */}
        <h1 className="ntp-greeting animate-fade-in">{greeting}</h1>
        <p className="ntp-sub animate-fade-in">{shell.tagline}</p>

        {/* Premium search box */}
        <form
          className={`ntp-search ${focused ? "ntp-search-focused" : ""} animate-slide-up`}
          onSubmit={handleSubmit}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-tertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="ntp-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => {
              setFocused(true);
              e.currentTarget.select();
            }}
            onBlur={() => setFocused(false)}
            placeholder="Search Google or type a URL"
            spellCheck={false}
            autoFocus
          />
          {query ? (
            <button
              type="button"
              className="ntp-search-action"
              onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
              title="Clear"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
          {loading ? (
            <svg className="h-4 w-4 animate-spin text-accent shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : null}
          <button
            type="button"
            className="ntp-search-action"
            title="Ask AI Assistant"
            onClick={() => setAgentOpen(true)}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 6 0 3 3 0 0 0 3-3 3 3 0 0 0 0-6V9a3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z" />
            </svg>
          </button>
        </form>

        {/* Shortcut tiles — refined Chrome/Edge style */}
        <div className="ntp-tiles animate-slide-up">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.url}
              type="button"
              className="ntp-tile"
              onClick={() => handleQuickLink(link)}
              title={link.url}
            >
              <span
                className="ntp-tile-icon"
                style={{ background: link.color }}
              >
                <span className="ntp-tile-letter">{link.letter}</span>
              </span>
              <span className="ntp-tile-label">{link.name}</span>
            </button>
          ))}
          {/* Add shortcut tile */}
          <button type="button" className="ntp-tile ntp-tile-add" title="Add shortcut">
            <span className="ntp-tile-icon">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="ntp-tile-label">Add</span>
          </button>
        </div>
      </div>

      {/* Footer — subtle status */}
      <div className="ntp-footer animate-fade-in">
        {isBrowserDesktopHost() ? (
          <>
            <span className="ntp-footer-dot bg-ok" />
            <span>Desktop host connected</span>
          </>
        ) : (
          <>
            <span className="ntp-footer-dot bg-warn" />
            <span>Web preview — launch desktop for full features</span>
          </>
        )}
        <span>·</span>
        <span>SDKWork Browser 0.1.0</span>
      </div>
    </div>
  );
}
