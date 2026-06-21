import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isolateFromDragRegion } from "@sdkwork/browser-pc-commons";

const VIEWPORT_PADDING = 8;

function clampMenuPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING);
  return {
    x: Math.min(Math.max(VIEWPORT_PADDING, x), maxX),
    y: Math.min(Math.max(VIEWPORT_PADDING, y), maxY),
  };
}

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
  label: string;
}

export function ContextMenu({ open, x, y, onClose, children, label }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    if (!open) return;
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) {
      setPosition({ x, y });
      return;
    }
    setPosition(clampMenuPosition(x, y, rect.width, rect.height));
  }, [open, x, y, children]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handleScroll(event: Event) {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <>
      <div
        className="context-menu-backdrop"
        data-tauri-drag-region="false"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className="context-menu glass-strong"
        style={{ left: position.x, top: position.y }}
        role="menu"
        aria-label={label}
        data-tauri-drag-region="false"
        onPointerDown={isolateFromDragRegion}
        onContextMenu={(event) => event.preventDefault()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export function ContextMenuItem({
  label,
  shortcut,
  disabled = false,
  onClick,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className="context-menu-item"
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
    >
      <span>{label}</span>
      {shortcut ? <span className="context-menu-shortcut">{shortcut}</span> : null}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="context-menu-separator" role="separator" />;
}
