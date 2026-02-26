package com.delivery.auth.dto;

import java.time.Instant;

public record PhoneVerificationCompleteResponse(
        String identityVerificationId,
        String status,
        String phoneNumber,
        String provider,
        Instant phoneVerifiedAt,
        boolean idempotent
) {
}
