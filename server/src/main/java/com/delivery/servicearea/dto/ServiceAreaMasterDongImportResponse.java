package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

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
        @Schema(description = "Distinct city/province count after import", example = "16")
        long cityCountAfterImport,
        @Schema(description = "Distinct district count after import", example = "262")
        long districtCountAfterImport,
        @Schema(description = "Minimum total row threshold", example = "3000")
        long minimumTotalCountThreshold,
        @Schema(description = "Minimum city/province threshold", example = "16")
        long minimumCityCountThreshold,
        @Schema(description = "Low data warning flag", example = "false")
        boolean lowDataWarning,
        @Schema(description = "Major city target count for coverage check", example = "4")
        long majorCityCoverageTarget,
        @Schema(description = "Number of covered major cities", example = "4")
        long majorCityCoverageMet,
        @Schema(description = "Missing major cities after import")
        List<String> missingMajorCities
) {
}
