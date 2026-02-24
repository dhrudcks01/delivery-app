package com.delivery.payment.entity;

import com.delivery.auth.entity.UserEntity;
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
@Table(name = "payment_methods")
public class PaymentMethodEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "method_type", nullable = false, length = 30)
    private String methodType;

    @Column(name = "customer_key", nullable = false, length = 191)
    private String customerKey;

    @Column(name = "billing_key_or_token", nullable = false, length = 255)
    private String billingKeyOrToken;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PaymentMethodEntity() {
    }

    public PaymentMethodEntity(
            UserEntity user,
            String provider,
            String methodType,
            String customerKey,
            String billingKeyOrToken,
            String status
    ) {
        this.user = Objects.requireNonNull(user);
        this.provider = Objects.requireNonNull(provider);
        this.methodType = Objects.requireNonNull(methodType);
        this.customerKey = Objects.requireNonNull(customerKey);
        this.billingKeyOrToken = Objects.requireNonNull(billingKeyOrToken);
        this.status = Objects.requireNonNull(status);
    }

    public void changeStatus(String status) {
        this.status = Objects.requireNonNull(status);
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

    public UserEntity getUser() {
        return user;
    }

    public String getProvider() {
        return provider;
    }

    public String getMethodType() {
        return methodType;
    }

    public String getCustomerKey() {
        return customerKey;
    }

    public String getBillingKeyOrToken() {
        return billingKeyOrToken;
    }

    public String getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
