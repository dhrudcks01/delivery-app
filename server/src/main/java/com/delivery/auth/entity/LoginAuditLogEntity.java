package com.delivery.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "login_audit_logs")
public class LoginAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "login_identifier", nullable = false, length = 255)
    private String loginIdentifier;

    @Column(name = "ip_address", nullable = false, length = 64)
    private String ipAddress;

    @Column(name = "user_agent", nullable = false, length = 500)
    private String userAgent;

    @Column(nullable = false, length = 30)
    private String result;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LoginAuditLogEntity() {
    }

    public LoginAuditLogEntity(String loginIdentifier, String ipAddress, String userAgent, String result) {
        this.loginIdentifier = loginIdentifier;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.result = result;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getLoginIdentifier() {
        return loginIdentifier;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getResult() {
        return result;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
