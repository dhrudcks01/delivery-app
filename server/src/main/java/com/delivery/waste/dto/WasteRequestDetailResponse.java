package com.delivery.waste.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record WasteRequestDetailResponse(
        Long id,
        String orderNo,
        Long userId,
        String status,
        String address,
        String contactPhone,
        String note,
        List<String> disposalItems,
        int bagCount,
        @Schema(description = "기사 업로드 사진 목록")
        List<PhotoItem> photos,
        BigDecimal measuredWeightKg,
        Instant measuredAt,
        Long measuredByDriverId,
        Long finalAmount,
        String currency,
        @Schema(description = "상태 타임라인(from/to/at)")
        List<StatusTimelineItem> statusTimeline,
        Long driverId,
        Instant assignedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public record PhotoItem(
            String url,
            String type,
            Instant createdAt
    ) {
    }

    public record StatusTimelineItem(
            String fromStatus,
            String toStatus,
            Instant at
    ) {
    }
}
