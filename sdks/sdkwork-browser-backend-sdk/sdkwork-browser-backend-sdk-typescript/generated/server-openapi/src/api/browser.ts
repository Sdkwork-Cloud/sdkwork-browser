import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { BrowserSessionsListData, SdkWorkPageData } from '../types';


export class BrowserSessionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.sessions.list */
  async list(requestOptions?: ApiRequestOptions): Promise<BrowserSessionsListData> {
    return this.client.request<BrowserSessionsListData>(backendApiPath(`/browser/sessions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export class BrowserEnginesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.engines.list */
  async list(requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    return this.client.request<SdkWorkPageData>(backendApiPath(`/browser/engines`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export class BrowserApi {
  public readonly engines: BrowserEnginesApi;
  public readonly sessions: BrowserSessionsApi;

  constructor(client: HttpClient) {
    this.engines = new BrowserEnginesApi(client);
    this.sessions = new BrowserSessionsApi(client);
  }

}

export function createBrowserApi(client: HttpClient): BrowserApi {
  return new BrowserApi(client);
}
