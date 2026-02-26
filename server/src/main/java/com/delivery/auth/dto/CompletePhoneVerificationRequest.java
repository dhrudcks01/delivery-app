package com.delivery.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record CompletePhoneVerificationRequest(
        @NotBlank(message = "identityVerificationId는 필수입니다.")
        String identityVerificationId
) {
}
