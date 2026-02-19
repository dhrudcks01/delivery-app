package com.delivery.waste.dto;

import jakarta.validation.constraints.NotNull;

public record AssignWasteRequest(
        @NotNull Long driverId
) {
}
