package com.sdkwork.browser.backend.sdk.model;


public class BrowserOperatorSession {
    private String sessionId;
    private String kind;
    private String activeEngineId;
    private String activeTabId;
    private Integer tabCount;
    private String agentRuntimeId;
    private String runtimeMode;
    private Integer mcpConnectorCount;
    private Integer observedAtUnix;

    public String getSessionId() {
        return this.sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getKind() {
        return this.kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getActiveEngineId() {
        return this.activeEngineId;
    }

    public void setActiveEngineId(String activeEngineId) {
        this.activeEngineId = activeEngineId;
    }

    public String getActiveTabId() {
        return this.activeTabId;
    }

    public void setActiveTabId(String activeTabId) {
        this.activeTabId = activeTabId;
    }

    public Integer getTabCount() {
        return this.tabCount;
    }

    public void setTabCount(Integer tabCount) {
        this.tabCount = tabCount;
    }

    public String getAgentRuntimeId() {
        return this.agentRuntimeId;
    }

    public void setAgentRuntimeId(String agentRuntimeId) {
        this.agentRuntimeId = agentRuntimeId;
    }

    public String getRuntimeMode() {
        return this.runtimeMode;
    }

    public void setRuntimeMode(String runtimeMode) {
        this.runtimeMode = runtimeMode;
    }

    public Integer getMcpConnectorCount() {
        return this.mcpConnectorCount;
    }

    public void setMcpConnectorCount(Integer mcpConnectorCount) {
        this.mcpConnectorCount = mcpConnectorCount;
    }

    public Integer getObservedAtUnix() {
        return this.observedAtUnix;
    }

    public void setObservedAtUnix(Integer observedAtUnix) {
        this.observedAtUnix = observedAtUnix;
    }
}
