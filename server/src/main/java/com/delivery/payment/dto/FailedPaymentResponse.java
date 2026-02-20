package com.delivery.payment.dto;

import java.time.Instant;

public record FailedPaymentResponse(
        Long paymentId,
        Long wasteRequestId,
        Long userId,
        Long amount,
        String currency,
        String failureCode,
        String failureMessage,
        Instant updatedAt
) {
}
