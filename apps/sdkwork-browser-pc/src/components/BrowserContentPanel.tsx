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
import { urlsEquivalent } from "../utils/navigationUrl.ts";

interface BrowserContentPanelProps {
  url: string;
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

// Sites known to block iframe embedding (X-Frame-Options / CSP frame-ancestors).
// We show the fallback immediately for these instead of waiting for timeout.
const KNOWN_BLOCKED_HOSTS = [
  "google.com",
  "www.google.com",
  "youtube.com",
  "www.youtube.com",
  "github.com",
  "mail.google.com",
  "accounts.google.com",
  "facebook.com",
  "www.facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "amazon.com",
  "reddit.com",
  "netflix.com",
  "bing.com",
  "www.bing.com",
];

function isLikelyBlocked(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return KNOWN_BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`));
  } catch {
    return false;
  }
}

type ContentSyncState = "idle" | "loading" | "synced" | "blocked" | "error";

export function BrowserContentPanel({ url }: BrowserContentPanelProps) {
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

  const openPage = useCallback(async (targetUrl: string) => {
    const anchor = anchorRef.current;
    if (!hostMode || !targetUrl || !anchor) {
      return;
    }

    const bounds = readAnchorBounds(anchor);
    if (bounds.width < 1 || bounds.height < 1) {
      return;
    }

    if (loadedUrlRef.current && urlsEquivalent(loadedUrlRef.current, targetUrl)) {
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

  // === Web preview (iframe) logic ===
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

    setSyncState("loading");
    setPreviewUrl(url);
    loadedUrlRef.current = url;

    // For known-blocked sites, show fallback quickly (1.2s) instead of waiting
    // the full timeout. For unknown sites, give them more time to load.
    const knownBlocked = isLikelyBlocked(url);
    const timeout = knownBlocked ? 1200 : 2500;

    blockedTimerRef.current = setTimeout(() => {
      setSyncState((prev) => (prev === "loading" ? "blocked" : prev));
    }, timeout);

    return () => {
      clearBlockedTimer();
    };
  }, [hostMode, url, clearBlockedTimer]);

  function handleIframeLoad() {
    const frame = iframeRef.current;
    if (!frame) {
      return;
    }

    // For known-blocked sites, ignore onLoad and let the timeout show the
    // fallback page. The browser renders a blank/error page inside the iframe
    // when X-Frame-Options blocks embedding, and onLoad fires for that.
    if (isLikelyBlocked(url)) {
      return;
    }

    clearBlockedTimer();

    // Try to access content document (only works for same-origin)
    try {
      const doc = frame.contentDocument;
      if (doc) {
        // Same-origin — we can read the DOM
        const html = doc.documentElement?.outerHTML;
        if (html && html.length > 50) {
          void syncLiveHtml(html);
          setSyncState("synced");
          return;
        }
      }
    } catch {
      // Cross-origin — can't access, but the page may have loaded successfully
    }

    // Cross-origin: if onLoad fired, the browser rendered something (either the
    // actual page or a blocked-content error page). Be optimistic and mark as
    // synced — the "Open externally" button is always available if the user
    // sees a blank page. This allows sites like Wikipedia that allow embedding
    // to display correctly instead of being falsely flagged as blocked.
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

  useEffect(() => {
    if (!hostMode) {
      return;
    }

    if (!url) {
      loadedUrlRef.current = null;
      setSyncState("idle");
      void hideContentWebview();
      return;
    }

    let cancelled = false;

    function tryOpen() {
      if (cancelled) {
        return;
      }
      const anchor = anchorRef.current;
      if (!anchor) {
        requestAnimationFrame(tryOpen);
        return;
      }
      const bounds = readAnchorBounds(anchor);
      if (bounds.width < 1 || bounds.height < 1) {
        requestAnimationFrame(tryOpen);
        return;
      }
      void openPage(url);
    }

    tryOpen();
    return () => {
      cancelled = true;
    };
  }, [hostMode, url, openPage]);

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

  const displayHost = hostFromUrl(previewUrl || url);

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
            ref={iframeRef}
            title="Browser content"
            className="absolute inset-0 h-full w-full border-0 bg-white"
            src={previewUrl}
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
            allow="fullscreen; clipboard-read; clipboard-write; geolocation; microphone; camera"
            onLoad={handleIframeLoad}
          />
        ) : null}
      </div>

      {/* Loading spinner overlay — shown while loading (before blocked detection) */}
      {!hostMode && syncState === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-white/60">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-8 w-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-[0.75rem] text-ink-tertiary">Loading {displayHost}…</span>
          </div>
        </div>
      ) : null}

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
              Many websites (Google, YouTube, GitHub) block embedding for
              security. Open it in a new browser tab, or run the Tauri desktop
              host for full in-app browsing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <a
                href={previewUrl}
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
                onClick={() => setDismissedBlocked(true)}
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

      {/* Floating "Open in new tab" — always available for cross-origin pages */}
      {!hostMode && previewUrl && (syncState === "synced" || syncState === "blocked") ? (
        <a
          href={previewUrl}
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
