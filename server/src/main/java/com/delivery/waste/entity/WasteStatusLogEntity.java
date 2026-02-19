package com.delivery.waste.entity;

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
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "waste_status_logs")
public class WasteStatusLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private WasteRequestEntity request;

    @Column(name = "from_status", length = 30)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 30)
    private String toStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private UserEntity actorUser;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WasteStatusLogEntity() {
    }

    public WasteStatusLogEntity(
            WasteRequestEntity request,
            String fromStatus,
            String toStatus,
            UserEntity actorUser
    ) {
        this.request = request;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.actorUser = actorUser;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public WasteRequestEntity getRequest() {
        return request;
    }

    public String getFromStatus() {
        return fromStatus;
    }

    public String getToStatus() {
        return toStatus;
    }

    public UserEntity getActorUser() {
        return actorUser;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
