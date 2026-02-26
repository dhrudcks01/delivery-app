package com.delivery.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

public record MeResponse(
        @Schema(description = "사용자 ID", example = "1")
        Long id,
        @Schema(description = "로그인 식별자", example = "user001")
        String email,
        @Schema(description = "사용자 표시 이름", example = "홍길동")
        String displayName,
        @Schema(description = "보유 역할 목록")
        List<String> roles,
        @Schema(description = "인증된 휴대폰 번호(마스킹)", example = "010-****-1234")
        String phoneNumber,
        @Schema(description = "휴대폰 인증 완료 시각(UTC)")
        Instant phoneVerifiedAt,
        @Schema(description = "휴대폰 인증 제공자", example = "PORTONE_DANAL")
        String phoneVerificationProvider
) {
}
