package com.delivery.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        @NotBlank(message = "email은 필수입니다.")
        String email,
        @NotBlank(message = "password는 필수입니다.")
        String password
) {
}
