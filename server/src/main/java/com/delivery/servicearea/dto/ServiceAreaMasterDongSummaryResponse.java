package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record ServiceAreaMasterDongSummaryResponse(
        @Schema(description = "Total master dong rows", example = "5421")
        long totalCount,
        @Schema(description = "Active master dong rows", example = "5410")
        long activeCount,
        @Schema(description = "Distinct city/province count", example = "16")
        long cityCount,
        @Schema(description = "Distinct district count", example = "262")
        long districtCount,
        @Schema(description = "Minimum total row threshold", example = "3000")
        long minimumTotalCountThreshold,
        @Schema(description = "Minimum city/province threshold", example = "16")
        long minimumCityCountThreshold,
        @Schema(description = "Low data warning flag", example = "false")
        boolean lowDataWarning
) {
}
