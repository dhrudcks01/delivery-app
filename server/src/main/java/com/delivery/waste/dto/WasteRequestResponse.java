package com.delivery.waste.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record WasteRequestResponse(
        Long id,
        String orderNo,
        Long userId,
        String address,
        String contactPhone,
        String note,
        @Schema(description = "배출품목 목록", example = "[\"일반쓰레기\", \"재활용\"]")
        List<String> disposalItems,
        @Schema(description = "수거비닐 수량", example = "2")
        int bagCount,
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
