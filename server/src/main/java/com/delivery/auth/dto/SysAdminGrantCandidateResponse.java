package com.delivery.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record SysAdminGrantCandidateResponse(
        @Schema(description = "사용자 PK", example = "18")
        Long userId,
        @Schema(description = "로그인 아이디", example = "opsadmin001")
        String loginId,
        @Schema(description = "사용자 이름", example = "김운영")
        String name
) {
}
