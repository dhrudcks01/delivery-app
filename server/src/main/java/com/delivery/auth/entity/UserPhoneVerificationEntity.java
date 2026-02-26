package com.delivery.auth.entity;

import com.delivery.auth.model.PhoneVerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "user_phone_verifications")
public class UserPhoneVerificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "identity_verification_id", nullable = false, length = 120)
    private String identityVerificationId;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "phone_e164", length = 20)
    private String phoneE164;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PhoneVerificationStatus status;

    @Column(name = "failure_code", length = 100)
    private String failureCode;

    @Column(name = "failure_message", length = 500)
    private String failureMessage;

    @Column(name = "ci")
    private byte[] ci;

    @Column(name = "di")
    private byte[] di;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserPhoneVerificationEntity() {
    }

    public UserPhoneVerificationEntity(
            UserEntity user,
            String identityVerificationId,
            String provider,
            String phoneE164
    ) {
        this.user = Objects.requireNonNull(user);
        this.identityVerificationId = Objects.requireNonNull(identityVerificationId);
        this.provider = Objects.requireNonNull(provider);
        this.phoneE164 = phoneE164;
        this.status = PhoneVerificationStatus.REQUESTED;
    }

    public void markVerified(byte[] ci, byte[] di, Instant verifiedAt) {
        this.status = PhoneVerificationStatus.VERIFIED;
        this.ci = ci;
        this.di = di;
        this.verifiedAt = Objects.requireNonNull(verifiedAt);
        this.failureCode = null;
        this.failureMessage = null;
    }

    public void markFailed(String failureCode, String failureMessage) {
        this.status = PhoneVerificationStatus.FAILED;
        this.failureCode = failureCode;
        this.failureMessage = failureMessage;
    }

    public void markDuplicate(String failureMessage) {
        this.status = PhoneVerificationStatus.DUPLICATE;
        this.failureCode = "DUPLICATE_VERIFICATION";
        this.failureMessage = failureMessage;
    }

    public void cancel() {
        this.status = PhoneVerificationStatus.CANCELED;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (this.requestedAt == null) {
            this.requestedAt = now;
        }
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

    public String getIdentityVerificationId() {
        return identityVerificationId;
    }

    public String getProvider() {
        return provider;
    }

    public String getPhoneE164() {
        return phoneE164;
    }

    public PhoneVerificationStatus getStatus() {
        return status;
    }

    public String getFailureCode() {
        return failureCode;
    }

    public String getFailureMessage() {
        return failureMessage;
    }

    public byte[] getCi() {
        return ci;
    }

    public byte[] getDi() {
        return di;
    }

    public Instant getRequestedAt() {
        return requestedAt;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
