package com.delivery.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Schema(description = "변경할 표시 이름", example = "새 닉네임")
        @Size(max = 100, message = "displayName은 100자를 초과할 수 없습니다.")
        String displayName,
        @Schema(
                description = "휴대폰 번호 변경은 지원하지 않습니다. 값이 전달되면 요청이 거절됩니다.",
                example = "01012341234"
        )
        String phoneNumber
) {
}
