package com.sdkwork.browser.backend.sdk;

import com.sdkwork.common.core.Types;
import com.sdkwork.browser.backend.sdk.http.HttpClient;
import com.sdkwork.browser.backend.sdk.api.BrowserApi;

public class SdkworkBackendClient {
    private final HttpClient httpClient;
    private BrowserApi browser;

    public SdkworkBackendClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.browser = new BrowserApi(httpClient);
    }

    public SdkworkBackendClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.browser = new BrowserApi(httpClient);
    }

    public BrowserApi getBrowser() {
        return this.browser;
    }
    public SdkworkBackendClient setAuthToken(String token) {
        httpClient.setAuthToken(token);
        return this;
    }

    public SdkworkBackendClient setAccessToken(String token) {
        httpClient.setAccessToken(token);
        return this;
    }

    public SdkworkBackendClient setHeader(String key, String value) {
        httpClient.setHeader(key, value);
        return this;
    }

    public HttpClient getHttpClient() {
        return httpClient;
    }
}
