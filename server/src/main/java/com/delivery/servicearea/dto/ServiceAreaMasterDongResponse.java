package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

public record ServiceAreaMasterDongResponse(
        @Schema(description = "행정구역 마스터 코드(10자리)", example = "1168010100")
        String code,
        @Schema(description = "시/도", example = "서울특별시")
        String city,
        @Schema(description = "시/군/구", example = "강남구")
        String district,
        @Schema(description = "행정동", example = "역삼동")
        String dong,
        @Schema(description = "마스터 사용 여부", example = "true")
        boolean active,
        @Schema(description = "생성 시각(UTC)")
        Instant createdAt,
        @Schema(description = "수정 시각(UTC)")
        Instant updatedAt
) {
}
