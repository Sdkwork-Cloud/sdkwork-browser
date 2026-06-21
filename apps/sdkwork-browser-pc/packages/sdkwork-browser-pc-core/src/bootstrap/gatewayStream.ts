import {
  gatewayAuthHeaders,
  resolveBrowserGatewayBaseUrl,
} from "./sdkClients.ts";

export interface GatewayChatStreamResult {
  chunks: string[];
  done?: string;
  action?: string;
}

export interface GatewayChatStreamOutcome {
  content: string;
  action?: string;
}

export type GatewaySseEvent =
  | { kind: "chunk"; data: string }
  | { kind: "done"; data: string }
  | { kind: "meta"; action?: string };

export function isGatewayStreamingAvailable(): boolean {
  return typeof fetch === "function";
}

export class SseLineParser {
  private buffer = "";
  private currentEvent: string | undefined;

  push(chunk: string): GatewaySseEvent[] {
    this.buffer += chunk;
    const events: GatewaySseEvent[] = [];
    let newlineIndex = this.buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newlineIndex + 1);
      const event = this.consumeLine(line);
      if (event) {
        events.push(event);
      }
      newlineIndex = this.buffer.indexOf("\n");
    }
    return events;
  }

  private consumeLine(line: string): GatewaySseEvent | undefined {
    if (line.startsWith("event:")) {
      this.currentEvent = line.slice(6).trim();
      return undefined;
    }
    if (!line.startsWith("data:")) {
      return undefined;
    }
    const data = line.slice(5).trim();
    if (!data) {
      return undefined;
    }
    if (this.currentEvent === "done") {
      this.currentEvent = undefined;
      return { kind: "done", data };
    }
    if (this.currentEvent === "meta") {
      this.currentEvent = undefined;
      return { kind: "meta", action: parseMetaAction(data) };
    }
    this.currentEvent = undefined;
    return { kind: "chunk", data };
  }
}

function parseMetaAction(payload: string): string | undefined {
  try {
    const parsed = JSON.parse(payload) as { action?: string };
    return typeof parsed.action === "string" ? parsed.action : undefined;
  } catch {
    return undefined;
  }
}

function applySseEvents(
  events: GatewaySseEvent[],
  state: { chunks: string[]; done?: string; action?: string },
): void {
  for (const event of events) {
    if (event.kind === "chunk") {
      state.chunks.push(event.data);
      continue;
    }
    if (event.kind === "meta" && event.action) {
      state.action = event.action;
      continue;
    }
    if (event.kind === "done") {
      state.done = event.data;
    }
  }
}

export function parseSsePayload(raw: string): GatewayChatStreamResult {
  const parser = new SseLineParser();
  const state: GatewayChatStreamResult = { chunks: [] };
  applySseEvents(parser.push(raw), state);
  return state;
}

async function readGatewayChatResponse(message: string): Promise<Response> {
  const baseUrl = resolveBrowserGatewayBaseUrl();
  const response = await fetch(`${baseUrl}/app/v3/api/browser/ai/actions`, {
    method: "POST",
    headers: {
      ...gatewayAuthHeaders(),
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      action: "chatStream",
      message,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway chat stream failed with HTTP ${response.status}`);
  }
  return response;
}

export async function streamGatewayAgentChat(
  message: string,
): Promise<GatewayChatStreamResult> {
  const response = await readGatewayChatResponse(message);
  const contentType = response.headers.get("content-type") ?? "";
  if (
    contentType.includes("text/event-stream") &&
    response.body &&
    typeof response.body.getReader === "function"
  ) {
    return readSseBody(response.body);
  }

  const raw = await response.text();
  if (contentType.includes("text/event-stream")) {
    return parseSsePayload(raw);
  }

  const json = JSON.parse(raw) as {
    data?: {
      chunks?: string[];
      reply?: { content?: string; action?: string };
    };
    message?: string;
  };
  const chunks = Array.isArray(json.data?.chunks) ? json.data.chunks : [];
  return {
    chunks,
    done: json.data?.reply?.content ?? json.message,
    action: json.data?.reply?.action,
  };
}

async function readSseBody(
  body: ReadableStream<Uint8Array>,
): Promise<GatewayChatStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseLineParser();
  const state: GatewayChatStreamResult = { chunks: [] };

  while (true) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) {
      break;
    }
    if (!value) {
      continue;
    }
    applySseEvents(parser.push(decoder.decode(value, { stream: true })), state);
  }

  applySseEvents(parser.push(decoder.decode()), state);
  return state;
}

export async function consumeGatewayAgentChatStream(
  message: string,
  onChunk: (chunk: string, rendered: string) => void,
): Promise<GatewayChatStreamOutcome> {
  const response = await readGatewayChatResponse(message);
  const contentType = response.headers.get("content-type") ?? "";

  if (
    contentType.includes("text/event-stream") &&
    response.body &&
    typeof response.body.getReader === "function"
  ) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseLineParser();
    let rendered = "";
    let action: string | undefined;
    let doneContent: string | undefined;

    const handleEvents = (events: GatewaySseEvent[]) => {
      for (const event of events) {
        if (event.kind === "meta" && event.action) {
          action = event.action;
          continue;
        }
        if (event.kind === "chunk") {
          rendered = rendered ? `${rendered} ${event.data}` : event.data;
          onChunk(event.data, rendered);
          continue;
        }
        if (event.kind === "done") {
          doneContent = event.data;
          if (!rendered) {
            rendered = event.data;
            onChunk(event.data, rendered);
          }
        }
      }
    };

    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) {
        break;
      }
      if (!value) {
        continue;
      }
      handleEvents(parser.push(decoder.decode(value, { stream: true })));
    }

    handleEvents(parser.push(decoder.decode()));
    return {
      content: doneContent ?? rendered,
      action,
    };
  }

  const stream = await streamGatewayAgentChat(message);
  let rendered = "";
  for (const chunk of stream.chunks) {
    rendered = rendered ? `${rendered} ${chunk}` : chunk;
    onChunk(chunk, rendered);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (stream.done && !rendered) {
    onChunk(stream.done, stream.done);
    return { content: stream.done, action: stream.action };
  }
  return {
    content: stream.done ?? rendered,
    action: stream.action,
  };
}
