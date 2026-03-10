package com.delivery.notification.dto;

import com.delivery.notification.model.NotificationBroadcastCategory;
import com.delivery.notification.model.NotificationBroadcastTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record NotificationBroadcastRequest(
        @NotBlank(message = "title은 필수입니다.")
        @Size(max = 120, message = "title은 120자를 초과할 수 없습니다.")
        String title,

        @NotBlank(message = "message는 필수입니다.")
        @Size(max = 500, message = "message는 500자를 초과할 수 없습니다.")
        String message,

        @NotNull(message = "targetType은 필수입니다.")
        NotificationBroadcastTargetType targetType,

        List<Long> targetUserIds,

        Instant scheduledAt,

        @NotNull(message = "category는 필수입니다.")
        NotificationBroadcastCategory category
) {
}
