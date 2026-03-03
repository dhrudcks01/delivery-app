package com.delivery.useraddress.dto;

import java.time.Instant;

public record UserAddressResponse(
        Long id,
        String roadAddress,
        String jibunAddress,
        String zipCode,
        String detailAddress,
        boolean isPrimary,
        Instant createdAt,
        Instant updatedAt
) {
}

