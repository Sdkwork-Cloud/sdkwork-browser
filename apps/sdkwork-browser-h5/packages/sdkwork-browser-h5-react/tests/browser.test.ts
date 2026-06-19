import { describe, expect, it } from "vitest";
import { createMobileBrowserShell } from "../src/browser.ts";

describe("createMobileBrowserShell", () => {
  it("reuses shared browser product identity", () => {
    expect(createMobileBrowserShell().title).toBe("SDKWork Browser");
  });
});
