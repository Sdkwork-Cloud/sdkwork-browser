import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { BrowserOperationCommand } from '../types';


export class BrowserTabsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.tabs.create */
  async create(body: BrowserOperationCommand): Promise<Record<string, unknown>> {
    return this.client.post<Record<string, unknown>>(appApiPath(`/browser/tabs`), body, undefined, undefined, 'application/json');
  }
}

export class BrowserSessionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.sessions.create */
  async create(body: BrowserOperationCommand): Promise<Record<string, unknown>> {
    return this.client.post<Record<string, unknown>>(appApiPath(`/browser/sessions`), body, undefined, undefined, 'application/json');
  }
}

export class BrowserAiActionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.aiActions.create */
  async create(body: BrowserOperationCommand): Promise<Record<string, unknown>> {
    return this.client.post<Record<string, unknown>>(appApiPath(`/browser/ai/actions`), body, undefined, undefined, 'application/json');
  }
}

export class BrowserApi {
  private client: HttpClient;
  public readonly aiActions: BrowserAiActionsApi;
  public readonly sessions: BrowserSessionsApi;
  public readonly tabs: BrowserTabsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.aiActions = new BrowserAiActionsApi(client);
    this.sessions = new BrowserSessionsApi(client);
    this.tabs = new BrowserTabsApi(client);
  }

}

export function createBrowserApi(client: HttpClient): BrowserApi {
  return new BrowserApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
