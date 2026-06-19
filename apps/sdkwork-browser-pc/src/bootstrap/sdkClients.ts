import { createClient as createAppClient, type SdkworkAppClient } from "@sdkwork/browser-app-sdk";
import {
  createClient as createBackendClient,
  type SdkworkBackendClient,
} from "@sdkwork/browser-backend-sdk";

import { getRuntimeEnvironment } from "./environment.ts";

const DEFAULT_GATEWAY_BASE_URL = "http://localhost:8080";

const DEV_AUTH_TOKEN =
  "tenant_id=sdkwork;user_id=browser;session_id=local;app_id=sdkwork-browser;auth_level=password";

const DEV_ACCESS_TOKEN =
  "tenant_id=sdkwork;user_id=browser;session_id=local;app_id=sdkwork-browser;environment=dev;deployment_mode=local";

export function gatewayAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${DEV_AUTH_TOKEN}`,
    "Access-Token": DEV_ACCESS_TOKEN,
    "X-SDKWork-Runtime-Environment": getRuntimeEnvironment(),
  };
}

export interface BrowserSdkClients {
  gatewayBaseUrl: string;
  appApiBaseUrl: string;
  backendApiBaseUrl: string;
  app: SdkworkAppClient;
  backend: SdkworkBackendClient;
}

export function resolveBrowserGatewayBaseUrl(): string {
  const configured =
    import.meta.env.VITE_BROWSER_GATEWAY_BASE_URL ??
    import.meta.env.VITE_BROWSER_APP_API_BASE_URL;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured.replace(/\/$/, "");
  }
  return DEFAULT_GATEWAY_BASE_URL;
}

export function resolveBrowserAppApiBaseUrl(): string {
  return resolveBrowserGatewayBaseUrl();
}

export function resolveBrowserBackendApiBaseUrl(): string {
  return resolveBrowserGatewayBaseUrl();
}

function createSdkClientConfig(baseUrl: string) {
  return {
    baseUrl,
    platform: "DESKTOP" as const,
    authToken: DEV_AUTH_TOKEN,
    accessToken: DEV_ACCESS_TOKEN,
    headers: {
      "X-SDKWork-Runtime-Environment": getRuntimeEnvironment(),
    },
  };
}

export function createBrowserSdkClients(): BrowserSdkClients {
  const gatewayBaseUrl = resolveBrowserGatewayBaseUrl();
  const clientConfig = createSdkClientConfig(gatewayBaseUrl);
  return {
    gatewayBaseUrl,
    appApiBaseUrl: gatewayBaseUrl,
    backendApiBaseUrl: gatewayBaseUrl,
    app: createAppClient(clientConfig),
    backend: createBackendClient(clientConfig),
  };
}
