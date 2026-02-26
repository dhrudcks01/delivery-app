package com.delivery.waste.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record WasteRequestResponse(
        Long id,
        String orderNo,
        Long userId,
        String address,
        String contactPhone,
        String note,
        String status,
        BigDecimal measuredWeightKg,
        Instant measuredAt,
        Long measuredByDriverId,
        Long finalAmount,
        String currency,
        Instant createdAt,
        Instant updatedAt
) {
}
