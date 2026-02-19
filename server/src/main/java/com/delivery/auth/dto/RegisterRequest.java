package com.delivery.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        @NotBlank(message = "email은 필수입니다.")
        String email,
        @NotBlank(message = "password는 필수입니다.")
        @Size(min = 8, message = "password는 8자 이상이어야 합니다.")
        String password,
        @NotBlank(message = "displayName은 필수입니다.")
        @Size(max = 100, message = "displayName은 100자를 초과할 수 없습니다.")
        String displayName
) {
}
