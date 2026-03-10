package com.delivery.notification.dto;

import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RegisterPushTokenRequest(
        @NotNull(message = "deviceType은 필수입니다.")
        PushTokenDeviceType deviceType,

        @NotNull(message = "provider는 필수입니다.")
        PushTokenProvider provider,

        @NotBlank(message = "pushToken은 필수입니다.")
        String pushToken
) {
}
