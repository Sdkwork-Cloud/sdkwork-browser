export const BROWSER_PRODUCT_NAME = "SDKWork Browser";

export const BROWSER_TAGLINE = "AI-native browsing across PC, H5, and Flutter mobile.";



export const BROWSER_ENGINE_IDS = {

  webview: "webview",

  servo: "servo",

  cef: "cef",

} as const;



export type BrowserEngineId =

  (typeof BROWSER_ENGINE_IDS)[keyof typeof BROWSER_ENGINE_IDS];



/** @deprecated Use BROWSER_ENGINE_IDS */

export const BROWSER_RUNTIME_PROFILES = BROWSER_ENGINE_IDS;



/** @deprecated Use BrowserEngineId */

export type BrowserRuntimeProfileId = BrowserEngineId;



export const BROWSER_ROUTE_IDS = {

  home: "browser.home",

  tabs: "browser.tabs",

  aiPanel: "browser.ai.panel",

} as const;



export const BROWSER_AI_ACTIONS = {

  navigate: "navigate",

  summarize: "summarize",

  groupTabs: "groupTabs",

  listMcp: "listMcp",

} as const;



export type BrowserAiActionId =

  (typeof BROWSER_AI_ACTIONS)[keyof typeof BROWSER_AI_ACTIONS];



export interface BrowserCommandItem {

  id: string;

  label: string;

  action: BrowserAiActionId | "chat" | "switchEngine" | "refresh";

  keywords: string[];

  payload?: Record<string, string>;

}



export const BROWSER_COMMAND_PALETTE: BrowserCommandItem[] = [

  {

    id: "cmd.summarize",

    label: "Summarize current page",

    action: BROWSER_AI_ACTIONS.summarize,

    keywords: ["summary", "tl;dr", "explain", "page"],

  },

  {

    id: "cmd.group-tabs",

    label: "Auto-group tabs by topic",

    action: BROWSER_AI_ACTIONS.groupTabs,

    keywords: ["spaces", "organize", "cluster", "tabs"],

  },

  {

    id: "cmd.list-mcp",

    label: "List MCP connectors",

    action: BROWSER_AI_ACTIONS.listMcp,

    keywords: ["tools", "github", "notion", "mcp"],

  },

  {

    id: "cmd.open-ai",

    label: "Open AI assistant",

    action: "chat",

    keywords: ["assistant", "agent", "ask", "chat"],

  },

  {

    id: "cmd.refresh",

    label: "Refresh browser snapshot",

    action: "refresh",

    keywords: ["reload", "sync", "snapshot"],

  },

];


