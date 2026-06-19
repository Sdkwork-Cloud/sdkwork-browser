import { createBrowserShell } from "@sdkwork/browser-pc-react";
import { useEffect, useMemo, useState } from "react";
import { BrowserContentPanel } from "../components/BrowserContentPanel.tsx";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";

interface QuickLink {
  name: string;
  url: string;
  letter: string;
  color: string;
}

const QUICK_LINKS: QuickLink[] = [
  { name: "Google", url: "https://www.google.com", letter: "G", color: "#4285f4" },
  { name: "YouTube", url: "https://www.youtube.com", letter: "Y", color: "#ff0000" },
  { name: "GitHub", url: "https://github.com", letter: "G", color: "#24292e" },
  { name: "Gmail", url: "https://mail.google.com", letter: "G", color: "#ea4335" },
  { name: "Maps", url: "https://maps.google.com", letter: "M", color: "#34a853" },
  { name: "Wikipedia", url: "https://www.wikipedia.org", letter: "W", color: "#636363" },
  { name: "Bing", url: "https://www.bing.com", letter: "B", color: "#0078d4" },
  { name: "Baidu", url: "https://www.baidu.com", letter: "B", color: "#2932e1" },
  { name: "Stack Overflow", url: "https://stackoverflow.com", letter: "S", color: "#f48024" },
  { name: "MDN", url: "https://developer.mozilla.org", letter: "M", color: "#000000" },
];

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function HomePage() {
  const shell = createBrowserShell();
  const snapshot = useBrowserShellStore((s) => s.snapshot);
  const loading = useBrowserShellStore((s) => s.loading);
  const error = useBrowserShellStore((s) => s.error);
  const refreshSnapshot = useBrowserShellStore((s) => s.refreshSnapshot);
  const loadUrl = useBrowserShellStore((s) => s.loadUrl);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const currentUrl = useMemo(
    () => snapshot?.tabs.find((t) => t.id === snapshot.active_tab_id)?.url ?? "",
    [snapshot?.tabs, snapshot?.active_tab_id],
  );

  useEffect(() => {
    if (currentUrl && !query) {
      setHasNavigated(true);
    }
  }, [currentUrl, query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = normalizeUrl(query);
    if (!target) return;
    setHasNavigated(true);
    void loadUrl(target);
  }

  function handleQuickLink(link: QuickLink) {
    setQuery(link.url);
    setHasNavigated(true);
    void loadUrl(link.url);
  }

  // Show browser content once navigated
  if (hasNavigated && (currentUrl || query)) {
    return (
      <div className="h-full">
        <BrowserContentPanel url={currentUrl || normalizeUrl(query)} />
        {error ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-lg border border-err/30 bg-surface-1 px-4 py-2.5 text-[0.8125rem] text-err shadow-lg animate-slide-up">
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

  // New tab page — Chrome/Edge style
  return (
    <div className="flex min-h-full flex-col items-center px-4 pt-[10vh] pb-10">
      <div className="w-full max-w-[680px] flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/20 to-ai/10 blur-2xl" />
            <svg viewBox="0 0 48 48" className="relative h-16 w-16" fill="none">
              <circle cx="24" cy="24" r="20" fill="url(#logoGrad)" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" />
                  <stop offset="100%" stopColor="var(--color-accent-press)" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="14" fill="none" stroke="#fff" strokeWidth="2" opacity="0.9" />
              <path d="M10 24h28M24 10a18 18 0 0 1 0 28M24 10a18 18 0 0 0 0 28" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            </svg>
          </div>
          <h1 className="text-[1.5rem] font-medium tracking-tight text-ink-primary">
            {shell.title}
          </h1>
        </div>

        {/* Search box — large, centered */}
        <form
          className={`w-full max-w-[560px] animate-slide-up`}
          onSubmit={handleSubmit}
        >
          <div
            className={`flex items-center gap-3 rounded-full border transition-all duration-150 ${
              focused
                ? "border-accent bg-surface-1 shadow-[0_1px_6px_rgba(32,33,36,0.28)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.4)]"
                : "border-hairline bg-surface-0 hover:bg-surface-1 hover:shadow-sm"
            }`}
            style={{ height: "46px", padding: "0 20px" }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-tertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="flex-1 bg-transparent text-[0.9375rem] text-ink-primary outline-none placeholder:text-ink-faint"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search Google or type a URL"
              spellCheck={false}
              autoFocus
            />
            {query ? (
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:bg-surface-2 hover:text-ink-secondary"
                onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
                title="Clear"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </div>

          {/* Search buttons — Google style */}
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="submit"
              className="rounded-md border border-hairline bg-surface-0 px-4 py-2 text-[0.8125rem] text-ink-secondary transition-colors hover:border-hairline-strong hover:bg-surface-1 hover:text-ink-primary"
            >
              SDKWork Search
            </button>
            <button
              type="button"
              className="rounded-md border border-hairline bg-surface-0 px-4 py-2 text-[0.8125rem] text-ink-secondary transition-colors hover:border-hairline-strong hover:bg-surface-1 hover:text-ink-primary"
              onClick={() => {
                setQuery("");
                void refreshSnapshot();
              }}
            >
              I'm Feeling Lucky
            </button>
          </div>
        </form>

        {/* Quick links grid */}
        <div className="mt-4 animate-slide-up">
          <div className="flex flex-wrap items-start justify-center gap-1 max-w-[680px]">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.url}
                type="button"
                className="quick-tile group"
                onClick={() => handleQuickLink(link)}
                title={link.url}
              >
                <span
                  className="quick-tile-icon"
                  style={{ background: link.color, color: "#fff" }}
                >
                  {link.letter}
                </span>
                <span className="quick-tile-label">{link.name}</span>
              </button>
            ))}
            {/* Add shortcut tile */}
            <button type="button" className="quick-tile" title="Add shortcut">
              <span className="quick-tile-icon !bg-transparent border-2 border-dashed border-hairline-strong text-ink-tertiary">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="quick-tile-label">Add</span>
            </button>
          </div>
        </div>

        {/* Footer info — subtle, like Chrome's bottom bar */}
        <div className="mt-auto pt-8 flex items-center gap-4 text-[0.6875rem] text-ink-faint animate-fade-in">
          {isBrowserDesktopHost() ? (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              Desktop host connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              Web preview — launch desktop for full features
            </span>
          )}
          <span>·</span>
          <span>SDKWork Browser 0.1.0</span>
        </div>
      </div>
    </div>
  );
}
