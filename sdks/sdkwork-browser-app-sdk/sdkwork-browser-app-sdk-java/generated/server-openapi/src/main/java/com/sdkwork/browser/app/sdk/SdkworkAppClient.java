package com.sdkwork.browser.app.sdk;

import com.sdkwork.common.core.Types;
import com.sdkwork.browser.app.sdk.http.HttpClient;
import com.sdkwork.browser.app.sdk.api.BrowserApi;

public class SdkworkAppClient {
    private final HttpClient httpClient;
    private BrowserApi browser;

    public SdkworkAppClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.browser = new BrowserApi(httpClient);
    }

    public SdkworkAppClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.browser = new BrowserApi(httpClient);
    }

    public BrowserApi getBrowser() {
        return this.browser;
    }
    public SdkworkAppClient setAuthToken(String token) {
        httpClient.setAuthToken(token);
        return this;
    }

    public SdkworkAppClient setAccessToken(String token) {
        httpClient.setAccessToken(token);
        return this;
    }

    public SdkworkAppClient setHeader(String key, String value) {
        httpClient.setHeader(key, value);
        return this;
    }

    public HttpClient getHttpClient() {
        return httpClient;
    }
}
