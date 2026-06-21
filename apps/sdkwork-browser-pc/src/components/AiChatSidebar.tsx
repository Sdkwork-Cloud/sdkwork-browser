import { BROWSER_AI_ACTIONS } from "@sdkwork/browser-contracts";
import { useEffect, useRef, useState } from "react";
import { describeAgentChatTransport } from "@sdkwork/browser-pc-core";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";
import { useAgentStore } from "../stores/agentStore.ts";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";

const SIDEBAR_ACTIONS = [
  { action: BROWSER_AI_ACTIONS.summarize, label: "Summarize", icon: "M4 6h16M4 12h16M4 18h10" },
  { action: BROWSER_AI_ACTIONS.groupTabs, label: "Group tabs", icon: "M3 7h18M3 12h18M3 17h18" },
  { action: BROWSER_AI_ACTIONS.listMcp, label: "MCP tools", icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" },
] as const;

export function AiChatSidebar() {
  const open = useAgentStore((s) => s.open);
  const busy = useAgentStore((s) => s.busy);
  const messages = useAgentStore((s) => s.messages);
  const pageContext = useAgentStore((s) => s.pageContext);
  const error = useAgentStore((s) => s.error);
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const runAction = useAgentStore((s) => s.runAction);
  const refreshPageContext = useAgentStore((s) => s.refreshPageContext);
  const toggleOpen = useAgentStore((s) => s.toggleOpen);
  const snapshot = useBrowserShellStore((s) => s.snapshot);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshPageContext();
  }, [refreshPageContext, snapshot?.active_tab_id, snapshot?.tabs.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!open) {
    return (
      <button
        type="button"
        className="group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-ai to-ai-soft px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-ai/30 transition-all duration-200 hover:shadow-xl hover:shadow-ai/40 hover:scale-[1.03]"
        onClick={toggleOpen}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 6 0 3 3 0 0 0 3-3 3 3 0 0 0 0-6V9a3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z" />
          </svg>
        </span>
        AI Assistant
      </button>
    );
  }

  return (
    <aside className="glass-strong fixed bottom-0 right-0 top-[3.75rem] z-40 flex w-full max-w-md flex-col border-l border-hairline animate-slide-up">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ai to-ai-soft shadow-glow-ai">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 6 0 3 3 0 0 0 3-3 3 3 0 0 0 0-6V9a3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z" />
            </svg>
          </span>
          <div>
            <h2 className="text-[0.875rem] font-semibold text-ink-primary">AI Assistant</h2>
            <p className="text-[0.6875rem] text-ink-faint">
              {describeAgentChatTransport()}
              {!isBrowserDesktopHost() ? " · web preview" : ""}
              {pageContext?.title ? ` · ${pageContext.title}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-surface-2 hover:text-ink-secondary"
          onClick={toggleOpen}
          title="Hide sidebar"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Page context strip */}
      {pageContext ? (
        <div className="border-b border-hairline-soft px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-ink-faint">
            <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20" />
            </svg>
            <span className="truncate">{pageContext.url}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[0.6875rem] text-ink-tertiary">
            <span className="pill">{pageContext.wordCountEstimate} words</span>
            <span className="pill">{pageContext.engineId ?? "idle"}</span>
            {pageContext.metaDescription ? (
              <span className="truncate text-ink-faint">
                {pageContext.metaDescription}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex max-w-[85%] items-end gap-2">
              {message.role !== "user" ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ai/15 text-ai-hover">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 6 0 3 3 0 0 0 3-3 3 3 0 0 0 0-6V9a3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z" />
                  </svg>
                </span>
              ) : null}
              <div
                className={`rounded-2xl px-3.5 py-2 text-[0.8125rem] leading-relaxed ${
                  message.role === "user"
                    ? "rounded-br-md bg-accent/15 text-ink-primary ring-1 ring-accent/20"
                    : "rounded-bl-md bg-surface-2/70 text-ink-secondary ring-1 ring-hairline-soft"
                }`}
              >
                {message.content || (
                  <span className="inline-flex items-center gap-1 py-0.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-err/20 bg-err/5 px-3 py-2 text-[0.75rem] text-err">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
            {error}
          </div>
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 border-t border-hairline-soft px-4 py-2.5">
        {SIDEBAR_ACTIONS.map((qa) => (
          <button
            key={qa.action}
            type="button"
            className="btn btn-subtle h-7 px-2.5 text-[0.75rem]"
            disabled={busy}
            onClick={() => void runAction(qa.action)}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={qa.icon} />
            </svg>
            {qa.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        className="border-t border-hairline p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft;
          setDraft("");
          void sendMessage(value);
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-hairline bg-surface-0/60 p-1.5 transition-colors focus-within:border-ai/50 focus-within:shadow-glow-ai">
          <input
            className="flex-1 bg-transparent px-2.5 py-1.5 text-[0.8125rem] text-ink-primary outline-none placeholder:text-ink-faint"
            placeholder="Ask about this page…"
            value={draft}
            disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ai to-ai-soft text-white transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            disabled={busy || !draft.trim()}
            title="Send"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </form>
    </aside>
  );
}
