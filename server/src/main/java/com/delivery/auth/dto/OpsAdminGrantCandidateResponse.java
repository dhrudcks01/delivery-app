package com.delivery.auth.dto;

public record OpsAdminGrantCandidateResponse(
        Long userId,
        String userEmail,
        String userDisplayName
) {
}
