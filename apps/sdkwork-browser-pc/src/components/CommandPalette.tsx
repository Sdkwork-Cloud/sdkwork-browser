import { BROWSER_COMMAND_PALETTE, type BrowserCommandItem } from "@sdkwork/browser-contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAgentStore } from "../stores/agentStore.ts";

function matchesQuery(command: BrowserCommandItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const haystack = [command.label, ...command.keywords].join(" ").toLowerCase();
  return haystack.includes(normalized);
}

function iconForAction(action: BrowserCommandItem["action"]): string {
  switch (action) {
    case "summarize":
      return "M4 6h16M4 12h16M4 18h10";
    case "groupTabs":
      return "M3 7h18M3 12h18M3 17h18";
    case "listMcp":
      return "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4";
    case "chat":
      return "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";
    case "refresh":
      return "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5";
    default:
      return "M5 12h14";
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const runCommand = useAgentStore((s) => s.runCommand);
  const setAgentOpen = useAgentStore((s) => s.setOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => BROWSER_COMMAND_PALETTE.filter((command) => matchesQuery(command, query)),
    [query],
  );

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isPalette = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (isPalette) {
        event.preventDefault();
        setOpen((value) => !value);
        setQuery("");
        setHighlight(0);
      }
      if (!open) {
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((value) => Math.max(value - 1, 0));
      }
      if (event.key === "Enter" && filtered[highlight]) {
        event.preventDefault();
        void runCommand(filtered[highlight]).then(() => {
          if (filtered[highlight].action === "chat") {
            setAgentOpen(true);
          }
          setOpen(false);
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, highlight, open, runCommand, setAgentOpen]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl border border-hairline-strong shadow-xl animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-3.5 text-[0.9375rem] text-ink-primary outline-none placeholder:text-ink-faint"
            placeholder="Ask AI or run a command…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
          />
          <kbd className="rounded border border-hairline bg-surface-0/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-ink-faint">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="M8 11h6" />
              </svg>
              <p className="text-[0.8125rem] text-ink-tertiary">No matching commands</p>
            </li>
          ) : (
            filtered.map((command, index) => {
              const active = index === highlight;
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 ${
                      active
                        ? "bg-ai/15 ring-1 ring-ai/20"
                        : "hover:bg-surface-2/50"
                    }`}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => {
                      void runCommand(command).then(() => {
                        if (command.action === "chat") {
                          setAgentOpen(true);
                        }
                        setOpen(false);
                      });
                    }}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        active
                          ? "bg-ai/25 text-ai-hover"
                          : "bg-surface-3 text-ink-tertiary"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={iconForAction(command.action)} />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-medium text-ink-primary">
                        {command.label}
                      </span>
                      <span className="block truncate text-[0.75rem] text-ink-faint">
                        {command.keywords.join(" · ")}
                      </span>
                    </span>
                    {active ? (
                      <kbd className="rounded border border-hairline bg-surface-0/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-ink-faint">
                        ↵
                      </kbd>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-hairline px-4 py-2 text-[0.6875rem] text-ink-faint">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-hairline bg-surface-0/60 px-1 py-0.5">↑</kbd>
              <kbd className="rounded border border-hairline bg-surface-0/60 px-1 py-0.5">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-hairline bg-surface-0/60 px-1 py-0.5">↵</kbd>
              select
            </span>
          </div>
          <span>SDKWork Browser</span>
        </div>
      </div>
    </div>
  );
}
