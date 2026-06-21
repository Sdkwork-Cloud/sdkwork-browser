import type { MouseEvent, PointerEvent } from "react";

/** Prevent Tauri/WebView2 drag regions from swallowing pointer events on interactive chrome. */
export function isolateFromDragRegion(event: MouseEvent | PointerEvent) {
  event.stopPropagation();
}
