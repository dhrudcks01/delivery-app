package com.delivery.notification.dto;

import com.delivery.notification.model.PushTokenProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DeactivatePushTokenRequest(
        @NotNull(message = "provider는 필수입니다.")
        PushTokenProvider provider,

        @NotBlank(message = "pushToken은 필수입니다.")
        String pushToken
) {
}
