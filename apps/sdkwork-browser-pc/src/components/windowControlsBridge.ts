import { invoke } from "@tauri-apps/api/core";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";

async function invokeDesktopWindow<T>(command: string): Promise<T | null> {
  if (!isBrowserDesktopHost()) {
    return null;
  }
  return invoke<T>(command);
}

export function minimizeDesktopWindow(): Promise<void | null> {
  return invokeDesktopWindow("desktop_window_minimize");
}

export function toggleMaximizeDesktopWindow(): Promise<void | null> {
  return invokeDesktopWindow("desktop_window_toggle_maximize");
}

export function closeDesktopWindow(): Promise<void | null> {
  return invokeDesktopWindow("desktop_window_close");
}

export function isDesktopWindowMaximized(): Promise<boolean | null> {
  return invokeDesktopWindow("desktop_window_is_maximized");
}
