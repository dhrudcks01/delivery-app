package com.delivery.notification.dto;

import com.delivery.notification.model.NotificationType;

import java.time.Instant;

public record UserNotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        boolean isRead,
        Instant createdAt
) {
}
