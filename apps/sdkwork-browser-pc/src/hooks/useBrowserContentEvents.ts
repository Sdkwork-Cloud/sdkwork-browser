import { useEffect } from "react";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";
import { normalizeNavigationUrl } from "../utils/navigationUrl.ts";

/**
 * Subscribes to native content-webview navigation events (in-page links, title changes, popups).
 */
export function useBrowserContentEvents() {
  const updateActiveTabFromContent = useBrowserShellStore((s) => s.updateActiveTabFromContent);
  const createTab = useBrowserShellStore((s) => s.createTab);
  const loadUrl = useBrowserShellStore((s) => s.loadUrl);

  useEffect(() => {
    if (!isBrowserDesktopHost()) {
      return;
    }

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");

      if (disposed) {
        return;
      }

      unlisteners.push(
        await listen<string>("browser-content-navigated", (event) => {
          const nextUrl = event.payload.trim();
          if (nextUrl && nextUrl !== "about:blank") {
            updateActiveTabFromContent({ url: nextUrl });
          }
        }),
      );

      unlisteners.push(
        await listen<string>("browser-content-title", (event) => {
          const title = event.payload.trim();
          if (title) {
            updateActiveTabFromContent({ title });
          }
        }),
      );

      unlisteners.push(
        await listen<string>("browser-content-new-window", (event) => {
          const normalized = normalizeNavigationUrl(event.payload);
          if (!normalized) {
            return;
          }
          createTab();
          void loadUrl(normalized);
        }),
      );
    })();

    return () => {
      disposed = true;
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, [createTab, loadUrl, updateActiveTabFromContent]);
}
