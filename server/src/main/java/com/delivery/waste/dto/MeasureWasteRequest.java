package com.delivery.waste.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record MeasureWasteRequest(
        @NotNull @DecimalMin(value = "0.001") BigDecimal measuredWeightKg,
        @NotEmpty List<@NotBlank @Size(max = 1000) String> photoUrls
) {
}
