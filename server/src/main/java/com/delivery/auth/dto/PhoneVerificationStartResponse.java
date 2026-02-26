package com.delivery.auth.dto;

public record PhoneVerificationStartResponse(
        String provider,
        String storeId,
        String channelKey,
        String identityVerificationId
) {
}
