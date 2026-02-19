package com.delivery.driver.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

public record DriverApplicationResponse(
        Long id,
        Long userId,
        String status,
        JsonNode payload,
        Long processedBy,
        Instant processedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
