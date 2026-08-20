import { appApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { BrowserOperationCommand } from '../types';


export class BrowserTabsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.tabs.create */
  async create(body: BrowserOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(appApiPath(`/browser/tabs`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class BrowserSessionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.sessions.create */
  async create(body: BrowserOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(appApiPath(`/browser/sessions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class BrowserAiActionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.aiActions.create */
  async create(body: BrowserOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(appApiPath(`/browser/ai/actions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class BrowserApi {
  public readonly aiActions: BrowserAiActionsApi;
  public readonly sessions: BrowserSessionsApi;
  public readonly tabs: BrowserTabsApi;

  constructor(client: HttpClient) {
    this.aiActions = new BrowserAiActionsApi(client);
    this.sessions = new BrowserSessionsApi(client);
    this.tabs = new BrowserTabsApi(client);
  }

}

export function createBrowserApi(client: HttpClient): BrowserApi {
  return new BrowserApi(client);
}
