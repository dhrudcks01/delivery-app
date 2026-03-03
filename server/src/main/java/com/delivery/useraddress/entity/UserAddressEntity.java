package com.delivery.useraddress.entity;

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
@Table(name = "user_addresses")
public class UserAddressEntity {

    private static final byte PRIMARY_MARKER = 1;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "road_address", nullable = false, length = 255)
    private String roadAddress;

    @Column(name = "jibun_address", length = 255)
    private String jibunAddress;

    @Column(name = "zip_code", length = 20)
    private String zipCode;

    @Column(name = "detail_address", length = 255)
    private String detailAddress;

    @Column(name = "is_primary", nullable = false)
    private boolean primaryAddress;

    @Column(name = "primary_marker")
    private Byte primaryMarker;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserAddressEntity() {
    }

    public UserAddressEntity(
            UserEntity user,
            String roadAddress,
            String jibunAddress,
            String zipCode,
            String detailAddress,
            boolean primaryAddress
    ) {
        this.user = Objects.requireNonNull(user);
        this.roadAddress = Objects.requireNonNull(roadAddress);
        this.jibunAddress = jibunAddress;
        this.zipCode = zipCode;
        this.detailAddress = detailAddress;
        setPrimaryAddress(primaryAddress);
    }

    public void updateAddress(String roadAddress, String jibunAddress, String zipCode, String detailAddress) {
        this.roadAddress = Objects.requireNonNull(roadAddress);
        this.jibunAddress = jibunAddress;
        this.zipCode = zipCode;
        this.detailAddress = detailAddress;
    }

    public void setPrimaryAddress(boolean primaryAddress) {
        this.primaryAddress = primaryAddress;
        this.primaryMarker = primaryAddress ? PRIMARY_MARKER : null;
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

    public String getRoadAddress() {
        return roadAddress;
    }

    public String getJibunAddress() {
        return jibunAddress;
    }

    public String getZipCode() {
        return zipCode;
    }

    public String getDetailAddress() {
        return detailAddress;
    }

    public boolean isPrimaryAddress() {
        return primaryAddress;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
