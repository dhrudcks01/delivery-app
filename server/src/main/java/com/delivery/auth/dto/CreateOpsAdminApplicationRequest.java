package com.delivery.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOpsAdminApplicationRequest(
        @NotBlank(message = "reason은 필수입니다.")
        @Size(max = 500, message = "reason은 500자 이하여야 합니다.")
        String reason
) {
}
