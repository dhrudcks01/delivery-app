package com.delivery.payment.entity;

import com.delivery.waste.entity.WasteRequestEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "payments")
public class PaymentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "waste_request_id", nullable = false)
    private WasteRequestEntity wasteRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_method_id")
    private PaymentMethodEntity paymentMethod;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_order_id", nullable = false, length = 191)
    private String providerOrderId;

    @Column(name = "provider_payment_key", length = 191)
    private String providerPaymentKey;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "failure_code", length = 100)
    private String failureCode;

    @Column(name = "failure_message", length = 1000)
    private String failureMessage;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PaymentEntity() {
    }

    public PaymentEntity(
            WasteRequestEntity wasteRequest,
            PaymentMethodEntity paymentMethod,
            String provider,
            String providerOrderId,
            String status,
            Long amount,
            String currency
    ) {
        this.wasteRequest = Objects.requireNonNull(wasteRequest);
        this.paymentMethod = paymentMethod;
        this.provider = Objects.requireNonNull(provider);
        this.providerOrderId = Objects.requireNonNull(providerOrderId);
        this.status = Objects.requireNonNull(status);
        this.amount = Objects.requireNonNull(amount);
        this.currency = Objects.requireNonNull(currency);
    }

    public void markSuccess(String providerPaymentKey) {
        this.providerPaymentKey = Objects.requireNonNull(providerPaymentKey);
        this.status = "SUCCEEDED";
        this.failureCode = null;
        this.failureMessage = null;
    }

    public void markFailure(String failureCode, String failureMessage) {
        this.status = "FAILED";
        this.failureCode = failureCode;
        this.failureMessage = failureMessage;
    }

    public void markPendingForRetry(PaymentMethodEntity paymentMethod) {
        this.paymentMethod = paymentMethod;
        this.status = "PENDING";
        this.providerPaymentKey = null;
        this.failureCode = null;
        this.failureMessage = null;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public WasteRequestEntity getWasteRequest() {
        return wasteRequest;
    }

    public PaymentMethodEntity getPaymentMethod() {
        return paymentMethod;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderOrderId() {
        return providerOrderId;
    }

    public String getProviderPaymentKey() {
        return providerPaymentKey;
    }

    public String getStatus() {
        return status;
    }

    public Long getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getFailureCode() {
        return failureCode;
    }

    public String getFailureMessage() {
        return failureMessage;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
