package com.delivery.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record OpsAdminGrantCandidateResponse(
        @Schema(description = "사용자 PK", example = "12")
        Long userId,
        @Schema(description = "로그인 아이디", example = "driver001")
        String loginId,
        @Schema(description = "사용자 이름", example = "홍길동")
        String name
) {
}
