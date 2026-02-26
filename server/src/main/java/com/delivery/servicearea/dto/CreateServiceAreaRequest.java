package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateServiceAreaRequest(
        @Schema(description = "시/도", example = "서울특별시")
        @NotBlank
        @Size(max = 100)
        String city,
        @Schema(description = "시/군/구", example = "마포구")
        @NotBlank
        @Size(max = 100)
        String district,
        @Schema(description = "동 단위 행정동", example = "서교동")
        @NotBlank
        @Size(max = 100)
        String dong
) {
    public String normalizedCity() {
        return city.trim();
    }

    public String normalizedDistrict() {
        return district.trim();
    }

    public String normalizedDong() {
        return dong.trim();
    }
}

