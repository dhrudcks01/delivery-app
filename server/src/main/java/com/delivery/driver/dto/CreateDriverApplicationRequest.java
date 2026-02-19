package com.delivery.driver.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

public record CreateDriverApplicationRequest(
        @NotNull JsonNode payload
) {
}
