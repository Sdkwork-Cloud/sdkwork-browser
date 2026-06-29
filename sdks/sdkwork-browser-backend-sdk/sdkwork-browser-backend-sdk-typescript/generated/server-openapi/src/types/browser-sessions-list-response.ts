import type { BrowserSessionsListData } from './browser-sessions-list-data';

export interface BrowserSessionsListResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
