package com.delivery.auth.dto;

public record SysAdminGrantCandidateResponse(
        Long userId,
        String userEmail,
        String userDisplayName
) {
}
