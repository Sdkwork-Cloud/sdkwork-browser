package com.sdkwork.browser.app.sdk.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.browser.app.sdk.http.HttpClient;
import com.sdkwork.browser.app.sdk.model.*;
import java.util.List;
import java.util.Map;

public class BrowserApi {
    private final HttpClient client;

    public BrowserApi(HttpClient client) {
        this.client = client;
    }

    /** browser.aiActions.create */
    public BrowserApiResult aiActionsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/browser/ai/actions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<BrowserApiResult>() {});
    }

    /** browser.sessions.create */
    public BrowserApiResult sessionsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/browser/sessions"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<BrowserApiResult>() {});
    }

    /** browser.tabs.create */
    public BrowserApiResult tabsCreate(Map<String, Object> body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/browser/tabs"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<BrowserApiResult>() {});
    }




}
