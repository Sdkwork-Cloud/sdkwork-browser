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
            // Set loading:true so the tab spinner shows during navigation.
            // The page-loaded event will clear it when the webview finishes.
            useBrowserShellStore.setState({ loading: true });
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
        await listen("browser-content-page-loaded", () => {
          // Page finished loading — clear the loading indicator.
          useBrowserShellStore.setState({ loading: false });
        }),
      );

      unlisteners.push(
        await listen<string>("browser-content-new-window", (event) => {
          const normalized = normalizeNavigationUrl(event.payload);
          if (!normalized) {
            return;
          }
          // Pass explicit tabId to avoid race if user switches tabs
          const newTabId = createTab();
          void loadUrl(normalized, newTabId);
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
