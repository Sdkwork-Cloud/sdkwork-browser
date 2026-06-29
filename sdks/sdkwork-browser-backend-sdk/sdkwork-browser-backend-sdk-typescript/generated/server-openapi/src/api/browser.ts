import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { BrowserSessionsListResponse, SdkWorkListResponse } from '../types';


export class BrowserSessionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.sessions.list */
  async list(): Promise<BrowserSessionsListResponse> {
    return this.client.get<BrowserSessionsListResponse>(backendApiPath(`/browser/sessions`));
  }
}

export class BrowserEnginesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** browser.engines.list */
  async list(): Promise<SdkWorkListResponse> {
    return this.client.get<SdkWorkListResponse>(backendApiPath(`/browser/engines`));
  }
}

export class BrowserApi {
  private client: HttpClient;
  public readonly engines: BrowserEnginesApi;
  public readonly sessions: BrowserSessionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.engines = new BrowserEnginesApi(client);
    this.sessions = new BrowserSessionsApi(client);
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
