package com.delivery.notification.dto;

import com.delivery.notification.model.NotificationBroadcastResultStatus;

import java.time.Instant;

public record NotificationBroadcastResponse(
        Long broadcastHistoryId,
        NotificationBroadcastResultStatus resultStatus,
        int targetCount,
        Instant scheduledAt,
        Instant executedAt
) {
}
