import { useEffect, useState } from "react";
import {
  invokeMcpTool,
  listMcpTools,
  type McpToolDescriptor,
} from "../bridge/browserPlatformBridge.ts";

export function McpToolsPanel() {
  const [tools, setTools] = useState<McpToolDescriptor[]>([]);
  const [status, setStatus] = useState("Loading MCP tools…");
  const [statusTone, setStatusTone] = useState<"idle" | "ok" | "warn">("idle");
  const [query, setQuery] = useState("sdkwork-browser");

  useEffect(() => {
    void (async () => {
      const listed = await listMcpTools();
      if (listed) {
        setTools(listed);
        setStatus(`${listed.length} tools registered`);
        setStatusTone("ok");
      } else {
        setStatus("Start the gateway with pnpm run dev:server or use the desktop host.");
        setStatusTone("warn");
      }
    })();
  }, []);

  async function runTool(tool: McpToolDescriptor) {
    setStatus("Invoking…");
    setStatusTone("idle");
    const result = await invokeMcpTool({
      connectorId: tool.connectorId,
      toolName: tool.name,
      arguments: { query },
    });
    if (result) {
      setStatus(result.message);
      setStatusTone("ok");
    } else {
      setStatus("MCP invoke failed");
      setStatusTone("warn");
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-ai-hover" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="eyebrow">MCP Connectors</span>
        </div>
        <span className={`pill ${statusTone === "ok" ? "pill-ok" : statusTone === "warn" ? "pill-warn" : ""}`}>
          {status}
        </span>
      </div>
      <input
        className="input mb-3 w-full text-xs"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tool query"
      />
      {tools.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <p className="text-[0.8125rem] text-ink-tertiary">No MCP tools available</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tools.map((tool) => (
            <li
              key={`${tool.connectorId}:${tool.name}`}
              className="group flex items-start justify-between gap-3 rounded-lg border border-hairline bg-surface-1/50 px-3 py-2.5 transition-colors hover:border-hairline-strong"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-mono text-[0.8125rem] font-medium text-ink-primary">
                  <span className="text-ai-hover">{tool.connectorId}</span>
                  <span className="text-ink-faint">::</span>
                  <span>{tool.name}</span>
                </p>
                <p className="mt-0.5 text-[0.75rem] text-ink-faint">
                  {tool.description}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost h-7 shrink-0 px-2.5 text-[0.75rem]"
                onClick={() => void runTool(tool)}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 7-7 7 7M12 19V5" />
                </svg>
                Run
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
