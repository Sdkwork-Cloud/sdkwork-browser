import { BROWSER_PRODUCT_NAME, BROWSER_TAGLINE } from "@sdkwork/browser-contracts";

export interface BrowserShellViewModel {
  title: string;
  tagline: string;
}

export function createBrowserShell(): BrowserShellViewModel {
  return {
    title: BROWSER_PRODUCT_NAME,
    tagline: BROWSER_TAGLINE,
  };
}
