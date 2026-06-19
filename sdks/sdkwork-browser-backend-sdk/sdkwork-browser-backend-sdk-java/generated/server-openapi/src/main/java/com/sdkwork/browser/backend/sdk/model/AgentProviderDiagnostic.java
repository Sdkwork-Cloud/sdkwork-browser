package com.sdkwork.browser.backend.sdk.model;

import java.util.List;
import java.util.Map;

public class AgentProviderDiagnostic {
    private String providerId;
    private String providerFamily;
    private String providerVersion;
    private Boolean typedRegistered;
    private Map<String, Object> health;
    private List<String> capabilities;

    public String getProviderId() {
        return this.providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getProviderFamily() {
        return this.providerFamily;
    }

    public void setProviderFamily(String providerFamily) {
        this.providerFamily = providerFamily;
    }

    public String getProviderVersion() {
        return this.providerVersion;
    }

    public void setProviderVersion(String providerVersion) {
        this.providerVersion = providerVersion;
    }

    public Boolean getTypedRegistered() {
        return this.typedRegistered;
    }

    public void setTypedRegistered(Boolean typedRegistered) {
        this.typedRegistered = typedRegistered;
    }

    public Map<String, Object> getHealth() {
        return this.health;
    }

    public void setHealth(Map<String, Object> health) {
        this.health = health;
    }

    public List<String> getCapabilities() {
        return this.capabilities;
    }

    public void setCapabilities(List<String> capabilities) {
        this.capabilities = capabilities;
    }
}
