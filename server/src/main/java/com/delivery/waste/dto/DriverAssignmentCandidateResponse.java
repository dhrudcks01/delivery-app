package com.delivery.waste.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record DriverAssignmentCandidateResponse(
        @Schema(description = "기사 사용자 PK", example = "21")
        Long driverId,
        @Schema(description = "기사 로그인 아이디", example = "driver001")
        String loginId,
        @Schema(description = "기사 이름", example = "김기사")
        String name
) {
}
