package com.delivery.payment.dto;

import java.time.Instant;

public record PaymentMethodRegistrationSuccessResponse(
        Long paymentMethodId,
        String provider,
        String methodType,
        String status,
        Instant createdAt
) {
}
