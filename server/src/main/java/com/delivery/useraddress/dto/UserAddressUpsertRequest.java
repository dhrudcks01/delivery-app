package com.delivery.useraddress.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserAddressUpsertRequest(
        @NotBlank(message = "roadAddress is required")
        @Size(max = 255, message = "roadAddress length must be <= 255")
        String roadAddress,
        @Size(max = 255, message = "jibunAddress length must be <= 255")
        String jibunAddress,
        @Size(max = 20, message = "zipCode length must be <= 20")
        String zipCode,
        @Size(max = 255, message = "detailAddress length must be <= 255")
        String detailAddress,
        Boolean isPrimary
) {
    public String normalizedRoadAddress() {
        return roadAddress.trim();
    }

    public String normalizedJibunAddress() {
        return normalizeOptional(jibunAddress);
    }

    public String normalizedZipCode() {
        return normalizeOptional(zipCode);
    }

    public String normalizedDetailAddress() {
        return normalizeOptional(detailAddress);
    }

    public boolean normalizedPrimary() {
        return Boolean.TRUE.equals(isPrimary);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return normalized;
    }
}

