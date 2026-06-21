import { BROWSER_AI_ACTIONS } from "@sdkwork/browser-contracts";
import { useEffect, useState } from "react";
import { createBrowserSdkClients, describeAgentChatTransport, describeRuntimeTransport } from "@sdkwork/browser-pc-core";
import { isBrowserDesktopHost } from "../bridge/browserPlatformBridge.ts";
import { McpToolsPanel } from "../components/McpToolsPanel.tsx";
import { OperatorConsolePanel } from "../components/OperatorConsolePanel.tsx";
import { useAgentStore } from "../stores/agentStore.ts";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";

const QUICK_ACTIONS = [
  {
    action: BROWSER_AI_ACTIONS.summarize,
    label: "Summarize",
    desc: "Condense the active page",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
  {
    action: BROWSER_AI_ACTIONS.groupTabs,
    label: "Group tabs",
    desc: "Cluster tabs by topic",
    icon: "M3 7h18M3 12h18M3 17h18",
  },
  {
    action: BROWSER_AI_ACTIONS.listMcp,
    label: "List MCP",
    desc: "Show MCP connectors",
    icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4",
  },
] as const;

export function AiPanelPage() {
  const engineId = useBrowserShellStore((s) => s.engineId);
  const snapshot = useBrowserShellStore((s) => s.snapshot);
  const messages = useAgentStore((s) => s.messages);
  const pageContext = useAgentStore((s) => s.pageContext);
  const busy = useAgentStore((s) => s.busy);
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const runAction = useAgentStore((s) => s.runAction);
  const refreshPageContext = useAgentStore((s) => s.refreshPageContext);
  const [sdkStatus, setSdkStatus] = useState<string>("");
  const [sdkBaseUrl, setSdkBaseUrl] = useState<string>("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const clients = createBrowserSdkClients();
    setSdkBaseUrl(clients.gatewayBaseUrl);
    void refreshPageContext();
  }, [refreshPageContext]);

  async function syncViaSdk() {
    const clients = createBrowserSdkClients();
    try {
      const result = await clients.app.browser.aiActions.create({
        action: BROWSER_AI_ACTIONS.summarize,
        engineId,
      });
      setSdkStatus(`Cloud SDK browser.aiActions.create -> ${result.code}`);
    } catch (error) {
      setSdkStatus(
        error instanceof Error
          ? `Cloud SDK pending gateway: ${error.message}`
          : "Cloud SDK pending gateway",
      );
    }
  }

  return (
    <section className="space-y-5 animate-fade-in">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ai to-ai-soft shadow-glow-ai">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 6 0 3 3 0 0 0 3-3 3 3 0 0 0 0-6V9a3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z" />
            </svg>
          </span>
          <h2 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-ink-primary">
            AI Control Center
          </h2>
        </div>
        <p className="text-sm text-ink-secondary">
          Local agent via Tauri host · Cloud sync via{" "}
          <code className="rounded bg-surface-2/60 px-1.5 py-0.5 text-[0.8125rem] text-accent-hover">
            @sdkwork/browser-app-sdk
          </code>{" "}
          · Operator via{" "}
          <code className="rounded bg-surface-2/60 px-1.5 py-0.5 text-[0.8125rem] text-accent-hover">
            @sdkwork/browser-backend-sdk
          </code>
        </p>
      </div>

      <OperatorConsolePanel />

      {/* Runtime + Cloud SDK cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-hover" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="3" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <span className="eyebrow">Runtime</span>
          </div>
          <dl className="space-y-2 text-[0.8125rem]">
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Engine</dt>
              <dd className="font-medium text-ink-secondary">{engineId}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Agent</dt>
              <dd className="font-medium text-ink-secondary">
                {snapshot?.agent_runtime_id ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Host</dt>
              <dd className="font-medium text-ink-secondary">
                {isBrowserDesktopHost() ? "Tauri desktop" : "Web preview"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Platform transport</dt>
              <dd className="font-medium text-ink-secondary">{describeRuntimeTransport()}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Chat transport</dt>
              <dd className="font-medium text-ink-secondary">{describeAgentChatTransport()}</dd>
            </div>
            {pageContext ? (
              <div className="flex items-center justify-between border-t border-hairline-soft pt-2">
                <dt className="text-ink-faint">Context</dt>
                <dd className="max-w-[60%] truncate font-medium text-ink-secondary">
                  {pageContext.title}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ai-hover" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="eyebrow">Cloud SDK</span>
          </div>
          <p className="text-[0.8125rem] text-ink-faint">Base URL</p>
          <p className="mb-3 truncate font-mono text-[0.75rem] text-ink-secondary">
            {sdkBaseUrl || "loading…"}
          </p>
          <p className="text-[0.8125rem] text-ink-secondary">
            {sdkStatus || "Ready for gateway-backed sync."}
          </p>
          <button
            type="button"
            className="btn btn-ghost mt-3"
            onClick={() => void syncViaSdk()}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" />
            </svg>
            Sync summarize via SDK
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-ai-hover" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
          </svg>
          <span className="eyebrow">Quick actions</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.action}
              type="button"
              className="group flex items-start gap-3 rounded-lg border border-hairline bg-surface-1/50 p-3 text-left transition-all duration-150 hover:border-ai/40 hover:bg-ai/5 disabled:opacity-40"
              disabled={busy}
              onClick={() => void runAction(qa.action)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ai/15 text-ai-hover transition-colors group-hover:bg-ai/25">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={qa.icon} />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-medium text-ink-primary">
                  {qa.label}
                </span>
                <span className="block text-[0.75rem] text-ink-faint">
                  {qa.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="mt-4 space-y-2.5">
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2 text-[0.8125rem] leading-relaxed ${
                    message.role === "user"
                      ? "bg-accent/15 text-ink-primary ring-1 ring-accent/20"
                      : "bg-surface-2/70 text-ink-secondary ring-1 ring-hairline-soft"
                  }`}
                >
                  {message.content || (
                    <span className="inline-flex items-center gap-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            className="flex gap-2 border-t border-hairline-soft pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              const value = draft;
              setDraft("");
              void sendMessage(value);
            }}
          >
            <input
              className="input flex-1"
              placeholder="Ask the browsing agent…"
              value={draft}
              disabled={busy}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="submit"
              className="btn btn-ai"
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4z" />
                <path d="M22 2 11 13" />
              </svg>
              Send
            </button>
          </form>
        </div>
      </div>

      <McpToolsPanel />
    </section>
  );
}
