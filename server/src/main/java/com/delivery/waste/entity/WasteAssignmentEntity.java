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
@Table(name = "waste_assignments")
public class WasteAssignmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private WasteRequestEntity request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private UserEntity driver;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    protected WasteAssignmentEntity() {
    }

    public WasteAssignmentEntity(WasteRequestEntity request, UserEntity driver) {
        this.request = request;
        this.driver = driver;
    }

    @PrePersist
    void onCreate() {
        this.assignedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public WasteRequestEntity getRequest() {
        return request;
    }

    public UserEntity getDriver() {
        return driver;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }
}
