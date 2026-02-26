package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

public record ServiceAreaResponse(
        @Schema(description = "서비스 지역 ID", example = "1")
        Long id,
        @Schema(description = "시/도", example = "서울특별시")
        String city,
        @Schema(description = "시/군/구", example = "마포구")
        String district,
        @Schema(description = "행정동", example = "서교동")
        String dong,
        @Schema(description = "활성 여부", example = "true")
        boolean active,
        @Schema(description = "생성 시각(UTC)")
        Instant createdAt,
        @Schema(description = "수정 시각(UTC)")
        Instant updatedAt
) {
}

