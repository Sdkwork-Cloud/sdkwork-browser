import { useEffect, useRef, useState } from "react";
import {
  captureContentDom,
  isBrowserDesktopHost,
  mountContentWebview,
  navigateContentWebview,
  syncLiveHtml,
} from "../bridge/browserPlatformBridge.ts";

interface BrowserContentPanelProps {
  url: string;
}

function readAnchorBounds(anchor: HTMLDivElement) {
  const rect = anchor.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function BrowserContentPanel({ url }: BrowserContentPanelProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState(url);
  const hostMode = isBrowserDesktopHost();
  const [syncState, setSyncState] = useState<"idle" | "synced" | "fallback" | "loading">("loading");

  useEffect(() => {
    setPreviewUrl(url);
    setSyncState("loading");
  }, [url]);

  useEffect(() => {
    if (!hostMode || !url) {
      return;
    }
    void navigateContentWebview(url).then(() => {
      setSyncState("synced");
    });
  }, [hostMode, url]);

  useEffect(() => {
    if (!hostMode) {
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const syncBounds = () => {
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
  }, [hostMode]);

  return (
    <div className="relative h-full w-full bg-white animate-fade-in">
      {/* Loading bar — Chrome style top progress bar */}
      {syncState === "loading" ? (
        <div className="absolute top-0 left-0 right-0 z-10 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 bg-accent animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
      ) : null}

      {/* Viewport */}
      <div
        ref={anchorRef}
        className="absolute inset-0 bg-white"
        data-testid="browser-content-anchor"
      >
        {!hostMode ? (
          <iframe
            title="Browser content"
            className="absolute inset-0 h-full w-full border-0 bg-white"
            src={previewUrl || "about:blank"}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={(event) => {
              setSyncState("synced");
              const frame = event.currentTarget;
              try {
                const doc = frame.contentDocument;
                if (!doc) return;
                const html = doc.documentElement?.outerHTML;
                if (html) {
                  void syncLiveHtml(html);
                }
              } catch {
                void syncLiveHtml(null);
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center bg-surface-0">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-surface-3 to-surface-2 ring-1 ring-hairline-strong">
              {syncState === "loading" ? (
                <svg className="h-7 w-7 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-ink-tertiary" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="14" x="3" y="5" rx="2" />
                  <path d="M3 9h18M8 5v14" />
                </svg>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[0.875rem] font-medium text-ink-secondary">
                {syncState === "loading" ? "Loading page…" : "Native content webview"}
              </p>
              <p className="max-w-xs text-[0.75rem] text-ink-faint">
                {syncState === "synced"
                  ? "DOM capture active — page content synced to agent context."
                  : "Cross-origin pages render through the Tauri child webview."}
              </p>
            </div>
            {hostMode && syncState === "synced" ? (
              <button
                type="button"
                className="btn btn-ghost !h-7 !text-[0.75rem]"
                onClick={() => void captureContentDom()}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Refresh capture
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
