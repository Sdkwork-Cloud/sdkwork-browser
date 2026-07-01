import { describe, expect, it } from "vitest";
import { BROWSER_ENGINE_IDS, BROWSER_PRODUCT_NAME } from "../src/index.ts";

describe("browser contracts", () => {
  it("aligns engine ids with registry", () => {
    expect(BROWSER_ENGINE_IDS.webview).toBe("webview");
    expect(BROWSER_ENGINE_IDS.servo).toBe("servo");
    expect(BROWSER_ENGINE_IDS.cef).toBe("cef");
    expect(BROWSER_PRODUCT_NAME).toBe("SDKWork Browser");
  });
});
