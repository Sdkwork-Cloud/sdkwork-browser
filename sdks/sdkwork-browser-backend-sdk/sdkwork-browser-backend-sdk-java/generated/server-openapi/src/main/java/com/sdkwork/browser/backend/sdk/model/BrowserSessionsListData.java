package com.sdkwork.browser.backend.sdk.model;

import java.util.List;

public class BrowserSessionsListData {
    private List<BrowserOperatorSession> sessions;
    private AgentRuntimeDiagnostics agentDiagnostics;

    public List<BrowserOperatorSession> getSessions() {
        return this.sessions;
    }

    public void setSessions(List<BrowserOperatorSession> sessions) {
        this.sessions = sessions;
    }

    public AgentRuntimeDiagnostics getAgentDiagnostics() {
        return this.agentDiagnostics;
    }

    public void setAgentDiagnostics(AgentRuntimeDiagnostics agentDiagnostics) {
        this.agentDiagnostics = agentDiagnostics;
    }
}
