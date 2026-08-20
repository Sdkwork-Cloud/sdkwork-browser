import type { BrowserSessionsListData } from './browser-sessions-list-data';

export interface BrowserSessionsListResponse {
  code: 0;
  data: unknown & { item: BrowserSessionsListData; };
  /** Server-owned request correlation id. */
  traceId: string;
}
