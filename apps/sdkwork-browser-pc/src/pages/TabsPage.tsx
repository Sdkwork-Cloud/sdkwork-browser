import { BROWSER_AI_ACTIONS } from "@sdkwork/browser-contracts";
import { useEffect, useMemo } from "react";
import { useAgentStore } from "../stores/agentStore.ts";
import { useBrowserShellStore } from "../stores/browserShellStore.ts";

const GROUP_LABELS: Record<string, string> = {
  "dev-tools": "Development",
  reference: "Reference",
  workspace: "Workspace",
  browsing: "Browsing",
};

const GROUP_ACCENTS: Record<string, string> = {
  "dev-tools": "bg-engine-cef",
  reference: "bg-engine-webview",
  workspace: "bg-accent",
  browsing: "bg-engine-servo",
};

function faviconLetter(title: string): string {
  const match = title.trim().match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "•";
}

export function TabsPage() {
  const snapshot = useBrowserShellStore((s) => s.snapshot);
  const loading = useBrowserShellStore((s) => s.loading);
  const refreshSnapshot = useBrowserShellStore((s) => s.refreshSnapshot);
  const autoGroupTabs = useBrowserShellStore((s) => s.autoGroupTabs);
  const setActiveTab = useBrowserShellStore((s) => s.setActiveTab);
  const runAction = useAgentStore((s) => s.runAction);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const tabs = snapshot?.tabs ?? [];
  const grouped = useMemo(() => {
    const buckets = new Map<string, typeof tabs>();
    for (const tab of tabs) {
      const key = tab.group_id ?? "ungrouped";
      const list = buckets.get(key) ?? [];
      list.push(tab);
      buckets.set(key, list);
    }
    return buckets;
  }, [tabs]);

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-ink-primary">
            Tab Spaces
          </h2>
          <p className="text-sm text-ink-secondary">
            AI-native tab management with domain-aware grouping via{" "}
            <code className="rounded bg-surface-2/60 px-1.5 py-0.5 text-[0.8125rem] text-accent-hover">
              sdkwork-browser-agent-service
            </code>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ai"
            disabled={loading || tabs.length === 0}
            onClick={() => void autoGroupTabs()}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            Auto-group tabs
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading || tabs.length === 0}
            onClick={() => void runAction(BROWSER_AI_ACTIONS.summarize)}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Summarize active
          </button>
        </div>
      </div>

      {tabs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-surface-3 to-surface-2 ring-1 ring-hairline-strong">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-ink-tertiary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h10v10H7zM3 7v10M17 7v10" transform="rotate(0 12 12)" />
              <rect width="14" height="10" x="5" y="7" rx="2" />
              <path d="M5 11h14" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-[0.9375rem] font-medium text-ink-secondary">
              No open tabs yet
            </p>
            <p className="text-[0.8125rem] text-ink-faint">
              Load a URL from Home to start browsing. Tabs will appear here,
              grouped automatically by topic.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([groupId, groupTabs]) => {
            const accent = GROUP_ACCENTS[groupId] ?? "bg-ink-tertiary";
            const label =
              groupId === "ungrouped"
                ? "Ungrouped"
                : (GROUP_LABELS[groupId] ?? groupId);
            return (
              <div key={groupId} className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${accent}`} />
                  <h3 className="eyebrow">{label}</h3>
                  <span className="pill">{groupTabs.length}</span>
                  <span className="h-px flex-1 bg-hairline-soft" />
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {groupTabs.map((tab) => {
                    const active = snapshot?.active_tab_id === tab.id;
                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          className={`group flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all duration-150 ${
                            active
                              ? "border-accent/50 bg-accent/5 shadow-glow-accent"
                              : "border-hairline bg-surface-1/60 hover:border-hairline-strong hover:bg-surface-2/50"
                          }`}
                          onClick={() => void setActiveTab(tab.id)}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[0.8125rem] font-semibold ${
                              active
                                ? "bg-accent/20 text-accent-hover"
                                : "bg-surface-3 text-ink-tertiary group-hover:text-ink-secondary"
                            }`}
                          >
                            {faviconLetter(tab.title)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.875rem] font-medium text-ink-primary">
                              {tab.title}
                            </span>
                            <span className="block truncate text-[0.75rem] text-ink-faint">
                              {tab.url}
                            </span>
                          </span>
                          {active ? (
                            <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-pulse-soft" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {snapshot?.mcp_connectors?.length ? (
        <div className="card-soft flex items-center gap-2 px-3.5 py-2.5 text-[0.75rem]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ai-hover" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-ink-tertiary">MCP connectors:</span>
          <div className="flex flex-wrap gap-1.5">
            {snapshot.mcp_connectors.map((c) => (
              <span key={c.id} className="pill pill-ai">
                {c.display_name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
