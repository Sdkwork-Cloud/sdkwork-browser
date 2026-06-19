import { describe, expect, it } from "vitest";

import { mapGatewaySnapshot } from "../../../src/bootstrap/gatewayPlatform.ts";

describe("gateway platform snapshot parser", () => {
  it("maps camelCase snapshot payloads from the gateway", () => {
    const snapshot = mapGatewaySnapshot({
      configuredEngine: "webview",
      activeEngineId: "webview",
      engineStarted: true,
      activeTabId: "tab-1",
      agentRuntimeId: "sdkwork-agent-runtime",
      tabs: [
        {
          id: "tab-1",
          title: "SDKWork",
          url: "https://sdkwork.example",
          pin_state: "none",
          group_id: "workspace",
        },
      ],
      mcpConnectors: [{ id: "github", displayName: "GitHub" }],
    });

    expect(snapshot?.configured_engine).toBe("webview");
    expect(snapshot?.tabs).toHaveLength(1);
    expect(snapshot?.tabs[0]?.group_id).toBe("workspace");
    expect(snapshot?.mcp_connectors?.[0]?.display_name).toBe("GitHub");
  });
});
