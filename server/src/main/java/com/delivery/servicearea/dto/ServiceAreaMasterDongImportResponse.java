package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record ServiceAreaMasterDongImportResponse(
        @Schema(description = "Inserted row count", example = "3210")
        long addedCount,
        @Schema(description = "Updated row count", example = "35")
        long updatedCount,
        @Schema(description = "Skipped row count (invalid/deprecated/no change)", example = "14")
        long skippedCount,
        @Schema(description = "Failed row count (DB errors, etc.)", example = "1")
        long failedCount,
        @Schema(description = "Total master rows after import", example = "5421")
        long totalCountAfterImport,
        @Schema(description = "Active master rows after import", example = "5410")
        long activeCountAfterImport,
        @Schema(description = "Distinct city/province count after import", example = "17")
        long cityCountAfterImport,
        @Schema(description = "Distinct district count after import", example = "262")
        long districtCountAfterImport,
        @Schema(description = "Minimum total row threshold", example = "3000")
        long minimumTotalCountThreshold,
        @Schema(description = "Minimum city/province threshold", example = "17")
        long minimumCityCountThreshold,
        @Schema(description = "Low data warning flag", example = "false")
        boolean lowDataWarning
) {
}
