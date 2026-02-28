package com.delivery.servicearea.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterServiceAreaByCodeRequest(
        @Schema(description = "행정구역 마스터 코드(10자리)", example = "1168010100")
        @NotBlank
        @Size(min = 10, max = 10)
        @Pattern(regexp = "\\d{10}")
        String code
) {
    public String normalizedCode() {
        return code.trim();
    }
}
