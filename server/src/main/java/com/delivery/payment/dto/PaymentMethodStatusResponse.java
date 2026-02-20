package com.delivery.payment.dto;

import java.time.Instant;
import java.util.List;

public record PaymentMethodStatusResponse(
        boolean canReregister,
        List<PaymentMethodStatusItem> paymentMethods
) {
    public record PaymentMethodStatusItem(
            Long id,
            String provider,
            String status,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}
