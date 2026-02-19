package com.delivery.auth.dto;

import java.util.List;

public record MeResponse(
        Long id,
        String email,
        String displayName,
        List<String> roles
) {
}
