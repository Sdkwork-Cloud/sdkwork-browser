package com.sdkwork.browser.backend.sdk.model;

import java.util.List;

public class AgentRuntimeDiagnostics {
    private String schemaVersion;
    private String runtimeId;
    private String agentId;
    private String state;
    private Integer providerCount;
    private Integer capabilityCount;
    private Integer typedProviderCount;
    private Integer manifestOnlyProviderCount;
    private List<String> missingRequiredCapabilities;
    private List<String> degradedCapabilities;
    private List<AgentProviderDiagnostic> providerDiagnostics;
    private String runtimeMode;

    public String getSchemaVersion() {
        return this.schemaVersion;
    }

    public void setSchemaVersion(String schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public String getRuntimeId() {
        return this.runtimeId;
    }

    public void setRuntimeId(String runtimeId) {
        this.runtimeId = runtimeId;
    }

    public String getAgentId() {
        return this.agentId;
    }

    public void setAgentId(String agentId) {
        this.agentId = agentId;
    }

    public String getState() {
        return this.state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public Integer getProviderCount() {
        return this.providerCount;
    }

    public void setProviderCount(Integer providerCount) {
        this.providerCount = providerCount;
    }

    public Integer getCapabilityCount() {
        return this.capabilityCount;
    }

    public void setCapabilityCount(Integer capabilityCount) {
        this.capabilityCount = capabilityCount;
    }

    public Integer getTypedProviderCount() {
        return this.typedProviderCount;
    }

    public void setTypedProviderCount(Integer typedProviderCount) {
        this.typedProviderCount = typedProviderCount;
    }

    public Integer getManifestOnlyProviderCount() {
        return this.manifestOnlyProviderCount;
    }

    public void setManifestOnlyProviderCount(Integer manifestOnlyProviderCount) {
        this.manifestOnlyProviderCount = manifestOnlyProviderCount;
    }

    public List<String> getMissingRequiredCapabilities() {
        return this.missingRequiredCapabilities;
    }

    public void setMissingRequiredCapabilities(List<String> missingRequiredCapabilities) {
        this.missingRequiredCapabilities = missingRequiredCapabilities;
    }

    public List<String> getDegradedCapabilities() {
        return this.degradedCapabilities;
    }

    public void setDegradedCapabilities(List<String> degradedCapabilities) {
        this.degradedCapabilities = degradedCapabilities;
    }

    public List<AgentProviderDiagnostic> getProviderDiagnostics() {
        return this.providerDiagnostics;
    }

    public void setProviderDiagnostics(List<AgentProviderDiagnostic> providerDiagnostics) {
        this.providerDiagnostics = providerDiagnostics;
    }

    public String getRuntimeMode() {
        return this.runtimeMode;
    }

    public void setRuntimeMode(String runtimeMode) {
        this.runtimeMode = runtimeMode;
    }
}
