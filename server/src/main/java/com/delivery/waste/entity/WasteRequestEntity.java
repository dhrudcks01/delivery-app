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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "waste_requests")
public class WasteRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(name = "contact_phone", nullable = false, length = 30)
    private String contactPhone;

    @Column(length = 1000)
    private String note;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "measured_weight_kg", precision = 10, scale = 3)
    private BigDecimal measuredWeightKg;

    @Column(name = "measured_at")
    private Instant measuredAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "measured_by_driver_id")
    private UserEntity measuredByDriver;

    @Column(name = "final_amount")
    private Long finalAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WasteRequestEntity() {
    }

    public WasteRequestEntity(
            UserEntity user,
            String address,
            String contactPhone,
            String note,
            String status,
            String currency
    ) {
        this.user = user;
        this.address = address;
        this.contactPhone = contactPhone;
        this.note = note;
        this.status = status;
        this.currency = currency;
    }

    public void changeStatus(String nextStatus) {
        this.status = Objects.requireNonNull(nextStatus);
    }

    public void markMeasured(BigDecimal measuredWeightKg, UserEntity driver, Instant measuredAt) {
        this.measuredWeightKg = Objects.requireNonNull(measuredWeightKg);
        this.measuredByDriver = Objects.requireNonNull(driver);
        this.measuredAt = Objects.requireNonNull(measuredAt);
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

    public String getAddress() {
        return address;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public String getNote() {
        return note;
    }

    public String getStatus() {
        return status;
    }

    public BigDecimal getMeasuredWeightKg() {
        return measuredWeightKg;
    }

    public Instant getMeasuredAt() {
        return measuredAt;
    }

    public UserEntity getMeasuredByDriver() {
        return measuredByDriver;
    }

    public Long getFinalAmount() {
        return finalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
