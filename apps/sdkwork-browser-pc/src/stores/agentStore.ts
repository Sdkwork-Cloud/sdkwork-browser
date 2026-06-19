import type { BrowserAiActionId, BrowserCommandItem } from "@sdkwork/browser-contracts";
import { BROWSER_AI_ACTIONS } from "@sdkwork/browser-contracts";
import { create } from "zustand";
import { resolveAgentChatTransport } from "../bootstrap/agentChatTransport.ts";
import { consumeGatewayAgentChatStream } from "../bootstrap/gatewayStream.ts";
import {
  executeBrowserAiAction,
  fetchPageContext,
  isBrowserDesktopHost,
  sendBrowserAgentChatStream,
  type BrowserPageContext,
} from "../bridge/browserPlatformBridge.ts";
import { useBrowserShellStore } from "./browserShellStore.ts";

export interface AgentChatEntry {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  action?: string;
}

interface AgentState {
  open: boolean;
  busy: boolean;
  pageContext: BrowserPageContext | null;
  messages: AgentChatEntry[];
  error: string | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  refreshPageContext: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  runAction: (
    action: BrowserAiActionId,
    payload?: { targetUrl?: string },
  ) => Promise<string | null>;
  runCommand: (command: BrowserCommandItem) => Promise<void>;
}

let messageCounter = 0;

function nextMessageId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

async function applyAgentAction(action?: string): Promise<void> {
  if (action === BROWSER_AI_ACTIONS.groupTabs) {
    await useBrowserShellStore.getState().autoGroupTabs();
  }
}

async function streamViaGateway(
  trimmed: string,
  assistantId: string,
  baseMessages: AgentChatEntry[],
  set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void,
): Promise<string | undefined> {
  let resolvedAction: string | undefined;
  const outcome = await consumeGatewayAgentChatStream(trimmed, (_chunk, rendered) => {
    set({
      messages: baseMessages.map((entry) =>
        entry.id === assistantId
          ? { ...entry, content: rendered, action: resolvedAction ?? entry.action }
          : entry,
      ),
    });
  });
  resolvedAction = outcome.action;
  set({
    messages: baseMessages.map((entry) =>
      entry.id === assistantId
        ? { ...entry, content: outcome.content, action: outcome.action ?? entry.action }
        : entry,
    ),
  });
  await applyAgentAction(outcome.action);
  return outcome.action;
}

async function streamViaTauri(
  trimmed: string,
  assistantId: string,
  baseMessages: AgentChatEntry[],
  set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void,
): Promise<boolean> {
  const response = await sendBrowserAgentChatStream({ message: trimmed });
  if (!response) {
    return false;
  }

  const messagesWithAssistant = [
    ...baseMessages.slice(0, -1),
    {
      id: assistantId,
      role: "assistant" as const,
      content: "",
      action: response.reply.action,
    },
  ];
  set({ messages: messagesWithAssistant });

  let rendered = "";
  for (const chunk of response.chunks) {
    rendered = rendered ? `${rendered} ${chunk}` : chunk;
    set({
      messages: messagesWithAssistant.map((entry) =>
        entry.id === assistantId ? { ...entry, content: rendered } : entry,
      ),
    });
    await new Promise((resolve) => setTimeout(resolve, 35));
  }

  await applyAgentAction(response.reply.action);
  return true;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  open: true,
  busy: false,
  pageContext: null,
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask me to summarize the page, auto-group tabs, list MCP tools, or navigate anywhere.",
    },
  ],
  error: null,
  setOpen: (open) => set({ open }),
  toggleOpen: () => set({ open: !get().open }),
  refreshPageContext: async () => {
    const context = await fetchPageContext();
    set({ pageContext: context });
  },
  sendMessage: async (message) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const userEntry: AgentChatEntry = {
      id: nextMessageId(),
      role: "user",
      content: trimmed,
    };

    set({
      busy: true,
      error: null,
      messages: [...get().messages, userEntry],
    });

    const assistantId = nextMessageId();
    const baseMessages = [
      ...get().messages,
      {
        id: assistantId,
        role: "assistant" as const,
        content: "",
      },
    ];
    set({ messages: baseMessages });

    const transport = resolveAgentChatTransport();

    try {
      if (transport === "gateway") {
        try {
          await streamViaGateway(trimmed, assistantId, baseMessages, set);
          set({ busy: false });
          return;
        } catch (gatewayError) {
          if (!isBrowserDesktopHost()) {
            throw gatewayError;
          }
        }
      }

      const streamed = await streamViaTauri(trimmed, assistantId, baseMessages, set);
      if (!streamed) {
        await streamViaGateway(trimmed, assistantId, baseMessages, set);
      }
      set({ busy: false });
    } catch (error) {
      set({
        busy: false,
        error: error instanceof Error ? error.message : "Agent chat failed",
      });
    }
  },
  runAction: async (action, payload) => {
    set({ busy: true, error: null });
    try {
      const engineId = useBrowserShellStore.getState().engineId;
      const result = await executeBrowserAiAction({
        action,
        targetUrl: payload?.targetUrl,
        engineId,
      });
      if (!result) {
        set({
          busy: false,
          error: "AI actions require Gateway (:8080) or the Tauri desktop host.",
        });
        return null;
      }

      if (action === BROWSER_AI_ACTIONS.navigate && payload?.targetUrl) {
        await useBrowserShellStore.getState().loadUrl(payload.targetUrl);
      }
      if (action === BROWSER_AI_ACTIONS.groupTabs) {
        await useBrowserShellStore.getState().autoGroupTabs();
      }

      set({
        busy: false,
        messages: [
          ...get().messages,
          {
            id: nextMessageId(),
            role: "assistant",
            content: result.message,
            action,
          },
        ],
      });
      await get().refreshPageContext();
      return result.message;
    } catch (error) {
      set({
        busy: false,
        error: error instanceof Error ? error.message : "AI action failed",
      });
      return null;
    }
  },
  runCommand: async (command) => {
    if (command.action === "chat") {
      set({ open: true });
      return;
    }
    if (command.action === "refresh") {
      await useBrowserShellStore.getState().refreshSnapshot();
      await get().refreshPageContext();
      return;
    }
    if (
      command.action === BROWSER_AI_ACTIONS.navigate &&
      command.payload?.targetUrl
    ) {
      await get().runAction(BROWSER_AI_ACTIONS.navigate, {
        targetUrl: command.payload.targetUrl,
      });
      return;
    }
    await get().runAction(command.action as BrowserAiActionId);
  },
}));
