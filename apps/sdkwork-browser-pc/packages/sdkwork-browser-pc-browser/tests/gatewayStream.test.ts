import { describe, expect, it } from "vitest";

import {
  parseSsePayload,
  SseLineParser,
} from "@sdkwork/browser-pc-core";

describe("gateway SSE parser", () => {
  it("parses chunk and done events", () => {
    const parsed = parseSsePayload(
      "data: hello\n\ndata: browser\n\nevent: done\ndata: hello browser\n\n",
    );
    expect(parsed.chunks).toEqual(["hello", "browser"]);
    expect(parsed.done).toBe("hello browser");
  });

  it("parses meta action events", () => {
    const parsed = parseSsePayload(
      'data: grouped\n\nevent: meta\ndata: {"action":"groupTabs"}\nevent: done\ndata: grouped tabs\n\n',
    );
    expect(parsed.chunks).toEqual(["grouped"]);
    expect(parsed.action).toBe("groupTabs");
    expect(parsed.done).toBe("grouped tabs");
  });

  it("parses incremental chunks across buffer boundaries", () => {
    const parser = new SseLineParser();
    const first = parser.push("data: hel");
    expect(first).toEqual([]);

    const second = parser.push("lo\n\ndata: browser\n\n");
    expect(second).toEqual([
      { kind: "chunk", data: "hello" },
      { kind: "chunk", data: "browser" },
    ]);

    const done = parser.push("event: done\ndata: hello browser\n\n");
    expect(done).toEqual([{ kind: "done", data: "hello browser" }]);
  });
});
