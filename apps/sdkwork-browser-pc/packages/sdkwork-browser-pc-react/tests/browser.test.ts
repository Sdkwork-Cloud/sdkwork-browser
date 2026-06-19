import { describe, expect, it } from "vitest";
import { createBrowserShell } from "../src/browser.ts";

describe("createBrowserShell", () => {
  it("exposes the browser product identity", () => {
    const shell = createBrowserShell();
    expect(shell.title).toBe("SDKWork Browser");
    expect(shell.tagline).toContain("AI");
  });
});
