package com.delivery.auth.dto;

import java.time.Instant;

public record OpsAdminApplicationResponse(
        Long id,
        Long userId,
        String userEmail,
        String userDisplayName,
        String status,
        String reason,
        Long processedBy,
        String processedByEmail,
        Instant processedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
