package com.delivery.notification.entity;

import com.delivery.auth.entity.UserEntity;
import com.delivery.notification.model.NotificationBroadcastCategory;
import com.delivery.notification.model.NotificationBroadcastResultStatus;
import com.delivery.notification.model.NotificationBroadcastTargetType;
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
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "notification_broadcast_histories")
public class NotificationBroadcastHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_user_id", nullable = false)
    private UserEntity actorUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 30)
    private NotificationBroadcastTargetType targetType;

    @Column(name = "target_user_ids_json")
    private String targetUserIdsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private NotificationBroadcastCategory category;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_status", nullable = false, length = 20)
    private NotificationBroadcastResultStatus resultStatus;

    @Column(name = "target_count", nullable = false)
    private int targetCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected NotificationBroadcastHistoryEntity() {
    }

    public NotificationBroadcastHistoryEntity(
            UserEntity actorUser,
            NotificationBroadcastTargetType targetType,
            String targetUserIdsJson,
            NotificationBroadcastCategory category,
            String title,
            String message,
            Instant scheduledAt,
            Instant executedAt,
            NotificationBroadcastResultStatus resultStatus,
            int targetCount
    ) {
        this.actorUser = Objects.requireNonNull(actorUser);
        this.targetType = Objects.requireNonNull(targetType);
        this.targetUserIdsJson = targetUserIdsJson;
        this.category = Objects.requireNonNull(category);
        this.title = Objects.requireNonNull(title);
        this.message = Objects.requireNonNull(message);
        this.scheduledAt = scheduledAt;
        this.executedAt = executedAt;
        this.resultStatus = Objects.requireNonNull(resultStatus);
        this.targetCount = targetCount;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UserEntity getActorUser() {
        return actorUser;
    }

    public NotificationBroadcastTargetType getTargetType() {
        return targetType;
    }

    public String getTargetUserIdsJson() {
        return targetUserIdsJson;
    }

    public NotificationBroadcastCategory getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }

    public NotificationBroadcastResultStatus getResultStatus() {
        return resultStatus;
    }

    public int getTargetCount() {
        return targetCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
