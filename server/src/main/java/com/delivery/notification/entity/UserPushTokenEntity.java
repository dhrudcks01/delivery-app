package com.delivery.notification.entity;

import com.delivery.auth.entity.UserEntity;
import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
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
@Table(name = "user_push_tokens")
public class UserPushTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false, length = 20)
    private PushTokenDeviceType deviceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 30)
    private PushTokenProvider provider;

    @Column(name = "push_token", nullable = false, length = 255)
    private String pushToken;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserPushTokenEntity() {
    }

    public UserPushTokenEntity(
            UserEntity user,
            PushTokenDeviceType deviceType,
            PushTokenProvider provider,
            String pushToken
    ) {
        this.user = Objects.requireNonNull(user);
        this.deviceType = Objects.requireNonNull(deviceType);
        this.provider = Objects.requireNonNull(provider);
        this.pushToken = Objects.requireNonNull(pushToken);
        this.active = true;
    }

    public void reactivate(PushTokenDeviceType deviceType) {
        this.deviceType = Objects.requireNonNull(deviceType);
        this.active = true;
        this.lastSeenAt = Instant.now();
    }

    public void deactivate() {
        this.active = false;
        this.lastSeenAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.lastSeenAt = now;
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

    public PushTokenDeviceType getDeviceType() {
        return deviceType;
    }

    public PushTokenProvider getProvider() {
        return provider;
    }

    public String getPushToken() {
        return pushToken;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
