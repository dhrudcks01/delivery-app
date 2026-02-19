package com.delivery.waste.entity;

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
@Table(name = "waste_photos")
public class WastePhotoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private WasteRequestEntity request;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(length = 30)
    private String type;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WastePhotoEntity() {
    }

    public WastePhotoEntity(WasteRequestEntity request, String url, String type) {
        this.request = request;
        this.url = url;
        this.type = type;
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

    public String getUrl() {
        return url;
    }

    public String getType() {
        return type;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
