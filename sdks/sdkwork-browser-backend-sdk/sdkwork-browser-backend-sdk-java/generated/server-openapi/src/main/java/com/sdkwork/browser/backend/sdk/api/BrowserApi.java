package com.sdkwork.browser.backend.sdk.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.browser.backend.sdk.http.HttpClient;
import com.sdkwork.browser.backend.sdk.model.*;
import java.util.List;
import java.util.Map;

public class BrowserApi {
    private final HttpClient client;

    public BrowserApi(HttpClient client) {
        this.client = client;
    }

    /** browser.engines.list */
    public SdkWorkListResponse enginesList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/browser/engines"));
        return client.convertValue(raw, new TypeReference<SdkWorkListResponse>() {});
    }

    /** browser.sessions.list */
    public BrowserSessionsListResponse sessionsList() throws Exception {
        Object raw = client.get(ApiPaths.backendPath("/browser/sessions"));
        return client.convertValue(raw, new TypeReference<BrowserSessionsListResponse>() {});
    }




}
