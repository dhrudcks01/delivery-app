package com.delivery.auth.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "phone_e164", length = 20)
    private String phoneE164;

    @Column(name = "phone_verified_at")
    private Instant phoneVerifiedAt;

    @Column(name = "phone_verification_provider", length = 30)
    private String phoneVerificationProvider;

    @Column(name = "identity_verification_id", length = 120)
    private String identityVerificationId;

    @Column(name = "ci")
    private byte[] ci;

    @Column(name = "di")
    private byte[] di;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserEntity() {
    }

    public UserEntity(String email, String passwordHash, String displayName, String status) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.status = status;
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

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getStatus() {
        return status;
    }

    public String getPhoneE164() {
        return phoneE164;
    }

    public Instant getPhoneVerifiedAt() {
        return phoneVerifiedAt;
    }

    public String getPhoneVerificationProvider() {
        return phoneVerificationProvider;
    }

    public String getIdentityVerificationId() {
        return identityVerificationId;
    }

    public byte[] getCi() {
        return ci;
    }

    public byte[] getDi() {
        return di;
    }
}
