package com.delivery.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.notification.expo")
public class ExpoPushProperties {

    private String baseUrl = "https://exp.host";
    private String sendPath = "/--/api/v2/push/send";
    private String accessToken = "";
    private int connectTimeoutMillis = 2000;
    private int readTimeoutMillis = 3000;
    private int maxRetryAttempts = 1;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            this.baseUrl = "https://exp.host";
            return;
        }
        this.baseUrl = baseUrl.trim();
    }

    public String getSendPath() {
        return sendPath;
    }

    public void setSendPath(String sendPath) {
        if (sendPath == null || sendPath.isBlank()) {
            this.sendPath = "/--/api/v2/push/send";
            return;
        }
        this.sendPath = sendPath.trim();
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken == null ? "" : accessToken.trim();
    }

    public int getConnectTimeoutMillis() {
        return connectTimeoutMillis;
    }

    public void setConnectTimeoutMillis(int connectTimeoutMillis) {
        if (connectTimeoutMillis <= 0) {
            this.connectTimeoutMillis = 2000;
            return;
        }
        this.connectTimeoutMillis = connectTimeoutMillis;
    }

    public int getReadTimeoutMillis() {
        return readTimeoutMillis;
    }

    public void setReadTimeoutMillis(int readTimeoutMillis) {
        if (readTimeoutMillis <= 0) {
            this.readTimeoutMillis = 3000;
            return;
        }
        this.readTimeoutMillis = readTimeoutMillis;
    }

    public int getMaxRetryAttempts() {
        return maxRetryAttempts;
    }

    public void setMaxRetryAttempts(int maxRetryAttempts) {
        if (maxRetryAttempts < 0) {
            this.maxRetryAttempts = 0;
            return;
        }
        this.maxRetryAttempts = maxRetryAttempts;
    }
}
