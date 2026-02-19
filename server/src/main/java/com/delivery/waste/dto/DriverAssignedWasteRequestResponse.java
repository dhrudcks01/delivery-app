package com.delivery.waste.dto;

import java.time.Instant;

public record DriverAssignedWasteRequestResponse(
        Long requestId,
        String status,
        String address,
        String contactPhone,
        String note,
        Instant assignedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
