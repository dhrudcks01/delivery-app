package com.delivery.auth.dto;

import java.time.Instant;

public record LoginAuditLogResponse(
        Long id,
        String loginIdentifier,
        String ipAddress,
        String userAgent,
        String result,
        Instant createdAt
) {
}
