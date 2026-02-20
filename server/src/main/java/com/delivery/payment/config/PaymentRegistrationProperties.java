package com.delivery.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.payment.registration")
public class PaymentRegistrationProperties {

    private String billingAuthBaseUrl = "https://api.tosspayments.com/v1/billing/authorizations/issue";
    private String successUrl = "http://localhost:8080/user/payment-methods/registration/success";
    private String failUrl = "http://localhost:8080/user/payment-methods/registration/fail";

    public String getBillingAuthBaseUrl() {
        return billingAuthBaseUrl;
    }

    public void setBillingAuthBaseUrl(String billingAuthBaseUrl) {
        this.billingAuthBaseUrl = billingAuthBaseUrl;
    }

    public String getSuccessUrl() {
        return successUrl;
    }

    public void setSuccessUrl(String successUrl) {
        this.successUrl = successUrl;
    }

    public String getFailUrl() {
        return failUrl;
    }

    public void setFailUrl(String failUrl) {
        this.failUrl = failUrl;
    }
}
