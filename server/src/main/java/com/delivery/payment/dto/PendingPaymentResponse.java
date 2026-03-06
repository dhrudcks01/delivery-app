package com.delivery.payment.dto;

import java.time.Instant;

public record PendingPaymentResponse(
        Long paymentId,
        Long wasteRequestId,
        Long userId,
        Long amount,
        String currency,
        Instant updatedAt
) {
}
