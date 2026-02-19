package com.delivery.waste.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateWasteRequestRequest(
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 30) String contactPhone,
        @Size(max = 1000) String note
) {
}
