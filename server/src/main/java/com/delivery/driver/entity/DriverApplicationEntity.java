package com.delivery.driver.entity;

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
@Table(name = "driver_applications")
public class DriverApplicationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false, columnDefinition = "json")
    private String payload;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private UserEntity processedBy;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DriverApplicationEntity() {
    }

    public DriverApplicationEntity(UserEntity user, String status, String payload) {
        this.user = user;
        this.status = status;
        this.payload = payload;
    }

    public void markProcessed(String status, UserEntity processedBy, Instant processedAt) {
        this.status = status;
        this.processedBy = Objects.requireNonNull(processedBy);
        this.processedAt = Objects.requireNonNull(processedAt);
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

    public String getStatus() {
        return status;
    }

    public String getPayload() {
        return payload;
    }

    public UserEntity getProcessedBy() {
        return processedBy;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
