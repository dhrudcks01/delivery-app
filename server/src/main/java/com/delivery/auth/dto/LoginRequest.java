package com.delivery.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @Schema(description = "로그인 아이디", example = "user001")
        @JsonAlias("email")
        @NotBlank(message = "id는 필수입니다.")
        String id,
        @NotBlank(message = "password는 필수입니다.")
        String password
) {
    public String normalizedId() {
        return id == null ? "" : id.trim();
    }
}
