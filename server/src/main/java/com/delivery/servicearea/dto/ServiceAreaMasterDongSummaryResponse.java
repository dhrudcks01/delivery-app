package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record ServiceAreaMasterDongSummaryResponse(
        @Schema(description = "총 마스터 동 데이터 건수", example = "5421")
        long totalCount,
        @Schema(description = "활성 마스터 동 데이터 건수", example = "5410")
        long activeCount,
        @Schema(description = "고유 시/도 개수", example = "17")
        long cityCount,
        @Schema(description = "고유 시/군/구 개수", example = "262")
        long districtCount,
        @Schema(description = "운영 최소 기대 총 건수", example = "3000")
        long minimumTotalCountThreshold,
        @Schema(description = "운영 최소 기대 시/도 개수", example = "17")
        long minimumCityCountThreshold,
        @Schema(description = "마스터 데이터 부족 경고 여부", example = "false")
        boolean lowDataWarning
) {
}
