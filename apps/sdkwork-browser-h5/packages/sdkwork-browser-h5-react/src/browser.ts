import { BROWSER_PRODUCT_NAME, BROWSER_TAGLINE } from "@sdkwork/browser-contracts";

export function createMobileBrowserShell() {
  return { title: BROWSER_PRODUCT_NAME, tagline: BROWSER_TAGLINE };
}
