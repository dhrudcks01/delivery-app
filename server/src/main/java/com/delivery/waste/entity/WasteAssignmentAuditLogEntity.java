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
@Table(name = "waste_assignment_audit_logs")
public class WasteAssignmentAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private WasteRequestEntity request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_user_id", nullable = false)
    private UserEntity actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_driver_id")
    private UserEntity fromDriver;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_driver_id", nullable = false)
    private UserEntity toDriver;

    @Column(name = "action", nullable = false, length = 30)
    private String action;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WasteAssignmentAuditLogEntity() {
    }

    public WasteAssignmentAuditLogEntity(
            WasteRequestEntity request,
            UserEntity actor,
            UserEntity fromDriver,
            UserEntity toDriver,
            String action
    ) {
        this.request = request;
        this.actor = actor;
        this.fromDriver = fromDriver;
        this.toDriver = toDriver;
        this.action = action;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
