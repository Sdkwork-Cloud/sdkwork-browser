import type { PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";
import { isolateFromDragRegion } from "../utils/tauriDragRegion.ts";
import {
  closeDesktopWindow,
  isDesktopWindowMaximized,
  minimizeDesktopWindow,
  toggleMaximizeDesktopWindow,
} from "./windowControlsBridge.ts";

function WindowControlButton({
  title,
  className,
  onActivate,
  children,
}: {
  title: string;
  className?: string;
  onActivate: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className ? `window-control-btn ${className}` : "window-control-btn"}
      title={title}
      aria-label={title}
      data-tauri-drag-region="false"
      onPointerDown={isolateFromDragRegion}
      onPointerUp={(event) => {
        isolateFromDragRegion(event);
        if (event.button === 0) {
          onActivate();
        }
      }}
    >
      {children}
    </button>
  );
}

function useWindowMaximized(): [boolean, () => void] {
  const [maximized, setMaximized] = useState(false);

  const refreshMaximized = useCallback(() => {
    void isDesktopWindowMaximized().then((value) => {
      if (value !== null) {
        setMaximized(value);
      }
    });
  }, []);

  useEffect(() => {
    if (!isBrowserDesktopHost()) {
      return;
    }

    refreshMaximized();
    window.addEventListener("resize", refreshMaximized);
    return () => window.removeEventListener("resize", refreshMaximized);
  }, [refreshMaximized]);

  return [maximized, refreshMaximized];
}

export function WindowControls() {
  const [maximized, refreshMaximized] = useWindowMaximized();

  if (!isBrowserDesktopHost()) {
    return null;
  }

  return (
    <div
      className="window-controls"
      data-tauri-drag-region="false"
      onPointerDown={isolateFromDragRegion}
    >
      <WindowControlButton title="Minimize" onActivate={() => void minimizeDesktopWindow()}>
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
        </svg>
      </WindowControlButton>
      <WindowControlButton
        title={maximized ? "Restore" : "Maximize"}
        onActivate={() => {
          void toggleMaximizeDesktopWindow().then(() => refreshMaximized());
        }}
      >
        {maximized ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3.5" y="1.5" width="7" height="7" />
            <path d="M1.5 3.5v7h7" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="1.5" y="1.5" width="9" height="9" />
          </svg>
        )}
      </WindowControlButton>
      <WindowControlButton
        title="Close"
        className="window-control-close"
        onActivate={() => void closeDesktopWindow()}
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <path
            d="M1.5 1.5l9 9M10.5 1.5l-9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </WindowControlButton>
    </div>
  );
}
