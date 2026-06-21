import { useEffect, useState } from "react";
import { createBrowserSdkClients } from "@sdkwork/browser-pc-core";

interface EngineRow {
  id: string;
  displayName: string;
  packageSizeMb: number;
  active: boolean;
  configured: boolean;
}

interface SessionRow {
  sessionId: string;
  kind: string;
  activeEngineId?: string | null;
  tabCount: number;
  agentRuntimeId: string;
}

function readEngines(data: Record<string, unknown>): EngineRow[] {
  const engines = data.engines;
  if (!Array.isArray(engines)) {
    return [];
  }
  return engines.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string") {
      return [];
    }
    return [{
      id: row.id,
      displayName: typeof row.displayName === "string" ? row.displayName : row.id,
      packageSizeMb: typeof row.packageSizeMb === "number" ? row.packageSizeMb : 0,
      active: row.active === true,
      configured: row.configured === true,
    }];
  });
}

function readSessions(data: Record<string, unknown>): SessionRow[] {
  const sessions = data.sessions;
  if (!Array.isArray(sessions)) {
    return [];
  }
  return sessions.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const row = entry as Record<string, unknown>;
    if (typeof row.sessionId !== "string") {
      return [];
    }
    return [{
      sessionId: row.sessionId,
      kind: typeof row.kind === "string" ? row.kind : "unknown",
      activeEngineId: typeof row.activeEngineId === "string" ? row.activeEngineId : null,
      tabCount: typeof row.tabCount === "number" ? row.tabCount : 0,
      agentRuntimeId: typeof row.agentRuntimeId === "string" ? row.agentRuntimeId : "—",
    }];
  });
}

export function OperatorConsolePanel() {
  const [status, setStatus] = useState("Loading operator surface…");
  const [statusTone, setStatusTone] = useState<"idle" | "ok" | "warn">("idle");
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const clients = createBrowserSdkClients();
    setStatus("Loading…");
    setStatusTone("idle");
    try {
      const [engineResult, sessionResult] = await Promise.all([
        clients.backend.browser.engines.list(),
        clients.backend.browser.sessions.list(),
      ]);
      setEngines(readEngines(engineResult.data));
      setSessions(readSessions(sessionResult.data));
      setStatus(`Gateway OK · ${engineResult.code} / ${sessionResult.code}`);
      setStatusTone("ok");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Backend SDK unavailable: ${error.message}`
          : "Backend SDK unavailable",
      );
      setStatusTone("warn");
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-hover" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m7 14 4-4 4 4 5-5" />
          </svg>
          <span className="eyebrow">Operator Console</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost h-7 px-2.5 text-[0.75rem]"
          onClick={() => void refresh()}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" />
          </svg>
          Refresh
        </button>
      </div>
      <p className="mb-3 text-[0.75rem] text-ink-faint">
        via{" "}
        <code className="rounded bg-surface-2/60 px-1.5 py-0.5 text-accent-hover">
          @sdkwork/browser-backend-sdk
        </code>{" "}
        · <span className={statusTone === "ok" ? "text-ok" : statusTone === "warn" ? "text-warn" : "text-ink-tertiary"}>{status}</span>
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">Engines</p>
          {engines.length === 0 ? (
            <p className="rounded-lg border border-hairline-soft bg-surface-1/40 px-3 py-4 text-center text-[0.75rem] text-ink-faint">
              No engines reported
            </p>
          ) : (
            <ul className="space-y-2">
              {engines.map((engine) => (
                <li
                  key={engine.id}
                  className="rounded-lg border border-hairline bg-surface-1/50 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[0.8125rem] font-medium text-ink-primary">
                      {engine.displayName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {engine.active ? (
                        <span className="pill pill-ok">
                          <span className="h-1 w-1 rounded-full bg-ok" />
                          active
                        </span>
                      ) : null}
                      {engine.configured ? (
                        <span className="pill">configured</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-[0.75rem] text-ink-faint">
                    ~{engine.packageSizeMb} MB
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="eyebrow mb-2">Sessions</p>
          {sessions.length === 0 ? (
            <p className="rounded-lg border border-hairline-soft bg-surface-1/40 px-3 py-4 text-center text-[0.75rem] text-ink-faint">
              No sessions reported
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li
                  key={session.sessionId}
                  className="rounded-lg border border-hairline bg-surface-1/50 px-3 py-2.5"
                >
                  <p className="font-mono text-[0.8125rem] font-medium text-ink-primary">
                    {session.sessionId}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-ink-faint">
                    <span className="pill">{session.kind}</span>
                    <span>{session.tabCount} tabs</span>
                    <span>·</span>
                    <span>engine {session.activeEngineId ?? "idle"}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[0.6875rem] text-ink-faint">
                    agent {session.agentRuntimeId}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
