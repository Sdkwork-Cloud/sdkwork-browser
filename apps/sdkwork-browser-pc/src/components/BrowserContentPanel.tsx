import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureContentDom,
  hideContentWebview,
  isBrowserDesktopHost,
  mountContentWebview,
  openContentWebview,
  syncLiveHtml,
  type ContentWebviewBounds,
} from "../bridge/browserPlatformBridge.ts";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";
import { urlsEquivalent } from "../utils/navigationUrl.ts";

interface BrowserContentPanelProps {
  url: string;
  /** Increments on every navigation — forces iframe reload even for same URL. */
  reloadNonce?: number;
  /** Active tab ID — detects tab switches to drive webview navigation. */
  activeTabId?: string | null;
}

function readAnchorBounds(anchor: HTMLDivElement): ContentWebviewBounds {
  const rect = anchor.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url || "about:blank";
  }
}

function faviconLetter(host: string): string {
  const match = host.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "•";
}

/**
 * Wrap a target URL with the dev proxy endpoint. The proxy strips
 * X-Frame-Options and CSP frame-ancestors headers so the iframe can embed
 * any website — mimicking what a real browser engine does natively.
 *
 * In production (Tauri desktop), the native WebView is used instead and
 * this function is never called.
 */
function toProxyUrl(targetUrl: string): string {
  return `/__browser_proxy__?url=${encodeURIComponent(targetUrl)}`;
}

type ContentSyncState = "idle" | "loading" | "synced" | "blocked" | "error";

export function BrowserContentPanel({ url, reloadNonce = 0, activeTabId = null }: BrowserContentPanelProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedUrlRef = useRef<string | null>(null);
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewUrl, setPreviewUrl] = useState(url);
  const hostMode = isBrowserDesktopHost();
  const [syncState, setSyncState] = useState<ContentSyncState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissedBlocked, setDismissedBlocked] = useState(false);

  const clearBlockedTimer = useCallback(() => {
    if (blockedTimerRef.current) {
      clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = null;
    }
  }, []);

  const openPage = useCallback(async (targetUrl: string, force = false) => {
    const anchor = anchorRef.current;
    if (!hostMode || !targetUrl || !anchor) {
      return;
    }

    const bounds = readAnchorBounds(anchor);
    if (bounds.width < 1 || bounds.height < 1) {
      return;
    }

    // Skip re-loading if the same URL is already loaded — unless forced
    // (e.g. reload button, Ctrl+R). This prevents redundant webview
    // navigation when the URL hasn't changed.
    if (!force && loadedUrlRef.current && urlsEquivalent(loadedUrlRef.current, targetUrl)) {
      setSyncState("synced");
      return;
    }

    setSyncState("loading");
    setLoadError(null);

    try {
      await openContentWebview(targetUrl, bounds);
      loadedUrlRef.current = targetUrl;
      setSyncState("synced");
    } catch (error) {
      setSyncState("error");
      setLoadError(error instanceof Error ? error.message : "Failed to open page");
    }
  }, [hostMode]);

  // === Web preview (iframe via dev proxy) logic ===
  useEffect(() => {
    if (hostMode) {
      return;
    }

    clearBlockedTimer();
    setDismissedBlocked(false);

    if (!url) {
      setSyncState("idle");
      setPreviewUrl("");
      return;
    }

    // If the iframe is already showing this URL (e.g., after a link click
    // triggered updateActiveTabFromContent), don't reload — just sync state.
    // This prevents a flash/double-load when the iframe navigates internally.
    try {
      const currentProxyUrl = iframeRef.current?.contentWindow?.location?.href;
      if (currentProxyUrl) {
        const urlObj = new URL(currentProxyUrl);
        const currentOriginalUrl = urlObj.searchParams.get("url");
        if (currentOriginalUrl && urlsEquivalent(currentOriginalUrl, url)) {
          loadedUrlRef.current = url;
          setSyncState("synced");
          return;
        }
      }
    } catch {
      // Cross-origin or iframe not yet loaded — proceed with normal load
    }

    setSyncState("loading");
    // Use the dev proxy URL so X-Frame-Options / CSP frame-ancestors are
    // stripped server-side — the iframe can then embed any website.
    setPreviewUrl(toProxyUrl(url));
    loadedUrlRef.current = url;

    // The proxy adds latency (server-side fetch + header stripping). Give
    // pages ample time to load — 12s covers slow sites and proxy overhead.
    blockedTimerRef.current = setTimeout(() => {
      setSyncState((prev) => (prev === "loading" ? "blocked" : prev));
    }, 12000);

    return () => {
      clearBlockedTimer();
    };
  }, [hostMode, url, reloadNonce, clearBlockedTimer]);

  function handleIframeLoad() {
    const frame = iframeRef.current;
    if (!frame) {
      return;
    }

    clearBlockedTimer();

    // Detect internal navigation (link click within the iframe). The proxy
    // serves content same-origin, so we can read contentWindow.location to
    // extract the original URL from the proxy's query parameter. If it
    // differs from the current tab URL, the user clicked a link — sync the
    // tab state so the omnibox and history stay correct.
    try {
      const currentProxyUrl = frame.contentWindow?.location?.href;
      if (currentProxyUrl) {
        const urlObj = new URL(currentProxyUrl);
        const originalUrl = urlObj.searchParams.get("url");
        if (originalUrl && !urlsEquivalent(originalUrl, url)) {
          // Internal navigation — update tab URL and history
          useBrowserShellStore.getState().updateActiveTabFromContent({ url: originalUrl });
        }
      }
    } catch {
      // Cross-origin or access denied — ignore
    }

    // The dev proxy serves content same-origin, so we can access the
    // contentDocument to verify the page actually loaded (not a blank
    // error page). This gives us reliable load detection.
    try {
      const doc = frame.contentDocument;
      if (doc) {
        const html = doc.documentElement?.outerHTML ?? "";
        // A real page has substantial content. Blank pages (<50 chars) are
        // usually error responses or blocked content.
        if (html.length > 50) {
          void syncLiveHtml(html);
          // Extract page title and sync to tab state — matches Chrome/Edge
          // behavior where the tab title updates after the page loads.
          const pageTitle = doc.title?.trim();
          if (pageTitle) {
            useBrowserShellStore.getState().updateActiveTabFromContent({ title: pageTitle });
          }
          setSyncState("synced");
          return;
        }
        // Blank same-origin page — likely a proxy error or empty response
        setSyncState("blocked");
        return;
      }
    } catch {
      // Cross-origin (shouldn't happen with proxy, but handle gracefully)
    }

    // Fallback: if onLoad fired, be optimistic
    setSyncState("synced");
  }

  // === Tauri host logic ===
  useEffect(() => {
    if (!hostMode) {
      return;
    }
    return () => {
      loadedUrlRef.current = null;
      void hideContentWebview();
    };
  }, [hostMode]);

  // Track reloadNonce, url, and activeTabId to detect navigation source
  const lastReloadNonceRef = useRef(reloadNonce);
  const lastUrlRef = useRef(url);
  const lastActiveTabIdRef = useRef<string | null>(activeTabId);

  useEffect(() => {
    if (!hostMode) {
      return;
    }

    if (!url) {
      loadedUrlRef.current = null;
      lastUrlRef.current = url;
      lastActiveTabIdRef.current = activeTabId;
      setSyncState("idle");
      void hideContentWebview();
      return;
    }

    // Detect navigation source:
    // - reloadNonce changed → loadUrl/goBack/goForward triggered this
    // - activeTabId changed → user switched tabs (or closed active tab)
    // - neither changed but url changed → internal navigation
    //   (webview navigated itself via link click/redirect). In this case
    //   the webview already shows the new page — just sync our ref and
    //   skip calling openPage to avoid double navigation.
    const reloadChanged = lastReloadNonceRef.current !== reloadNonce;
    const tabChanged = lastActiveTabIdRef.current !== activeTabId;
    const urlChanged = lastUrlRef.current !== url;
    lastReloadNonceRef.current = reloadNonce;
    lastUrlRef.current = url;
    lastActiveTabIdRef.current = activeTabId;

    if (urlChanged && !reloadChanged && !tabChanged) {
      // Internal navigation — webview already navigated. Sync ref only.
      loadedUrlRef.current = url;
      setSyncState("synced");
      return;
    }

    // External navigation, reload, or tab switch — drive the webview.
    // For tab switches, reset loadedUrlRef so openPage doesn't skip
    // navigation even if the new tab has the same URL as the old tab.
    if (tabChanged) {
      loadedUrlRef.current = null;
    }

    const isReload = (reloadChanged || tabChanged) && !urlChanged;
    let cancelled = false;
    const MAX_OPEN_RETRIES = 60; // ~1s at 60fps

    function tryOpen(retries = 0) {
      if (cancelled || retries >= MAX_OPEN_RETRIES) {
        return;
      }
      const anchor = anchorRef.current;
      if (!anchor) {
        requestAnimationFrame(() => tryOpen(retries + 1));
        return;
      }
      const bounds = readAnchorBounds(anchor);
      if (bounds.width < 1 || bounds.height < 1) {
        requestAnimationFrame(() => tryOpen(retries + 1));
        return;
      }
      void openPage(url, isReload);
    }

    tryOpen();
    return () => {
      cancelled = true;
    };
  }, [hostMode, url, reloadNonce, activeTabId, openPage]);

  useEffect(() => {
    if (!hostMode) {
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const syncBounds = () => {
      if (!url) {
        return;
      }
      void mountContentWebview(readAnchorBounds(anchor));
    };

    syncBounds();
    const observer = new ResizeObserver(syncBounds);
    observer.observe(anchor);
    window.addEventListener("resize", syncBounds);
    window.addEventListener("scroll", syncBounds, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncBounds);
      window.removeEventListener("scroll", syncBounds, true);
    };
  }, [hostMode, url]);

  // Display host is derived from the original URL, not the proxy URL.
  const displayHost = hostFromUrl(url);

  return (
    <div className="relative h-full w-full bg-white animate-fade-in">
      {/* Loading progress bar — Chrome style */}
      {syncState === "loading" ? (
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden bg-accent/10">
          <div className="h-full w-1/3 bg-accent animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
      ) : null}

      {/* Content viewport */}
      <div
        ref={anchorRef}
        className="absolute inset-0 bg-white"
        data-testid="browser-content-anchor"
      >
        {!hostMode && previewUrl ? (
          <iframe
            key={`${previewUrl}-${reloadNonce}`}
            ref={iframeRef}
            title={displayHost || "Browser content"}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            src={previewUrl}
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"
            allow="fullscreen"
            onLoad={handleIframeLoad}
          />
        ) : null}
      </div>

      {/* Blocked-site fallback — professional, like Chrome's error page */}
      {!hostMode && syncState === "blocked" && !dismissedBlocked ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas px-6 animate-fade-in">
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-[1.5rem] font-semibold text-white shadow-md" style={{ background: "#4285f4" }}>
              {faviconLetter(displayHost)}
            </div>
            <h2 className="mb-1.5 text-[1.125rem] font-semibold text-ink-primary">
              {displayHost}
            </h2>
            <p className="mb-1 text-[0.875rem] text-ink-secondary">
              This site can't be displayed in the preview pane.
            </p>
            <p className="mb-6 text-[0.75rem] text-ink-faint">
              The page took too long to load or returned an error. Open it
              in a new browser tab, or run the Tauri desktop host for full
              in-app browsing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                Open in new tab
              </a>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  // Force iframe reload by toggling src
                  const frame = iframeRef.current;
                  if (frame) {
                    const currentSrc = frame.src;
                    frame.src = "about:blank";
                    requestAnimationFrame(() => { frame.src = currentSrc; });
                  }
                  setDismissedBlocked(true);
                }}
              >
                Show page anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tauri error state */}
      {hostMode && syncState === "error" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-0 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-err/10">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-err" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <p className="text-[0.9375rem] font-medium text-ink-primary">Unable to load page</p>
          <p className="max-w-sm text-[0.75rem] text-ink-faint">{loadError}</p>
          <button
            type="button"
            className="btn btn-ghost !h-8 !text-[0.8125rem]"
            onClick={() => {
              loadedUrlRef.current = null;
              void openPage(url);
            }}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" />
            </svg>
            Retry
          </button>
        </div>
      ) : null}

      {/* Floating "Open in new tab" — always available for pages */}
      {!hostMode && url && (syncState === "synced" || syncState === "blocked") ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-hairline bg-surface-1/90 px-3 py-1.5 text-[0.75rem] font-medium text-ink-secondary shadow-md backdrop-blur transition-colors hover:bg-surface-2 hover:text-ink-primary"
          title="Open in new browser tab"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
          Open externally
        </a>
      ) : null}

      {/* Tauri DOM capture refresh */}
      {hostMode && syncState === "synced" ? (
        <button
          type="button"
          className="absolute bottom-3 right-3 z-10 btn btn-ghost !h-7 !text-[0.75rem] opacity-70 hover:opacity-100"
          onClick={() => void captureContentDom()}
          title="Refresh DOM capture for AI context"
        >
          Refresh capture
        </button>
      ) : null}
    </div>
  );
}
