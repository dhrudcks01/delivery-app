package com.delivery.web.error;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        List<FieldViolation> errors
) {

    public record FieldViolation(String field, String message) {
    }

    public static ApiErrorResponse of(int status, String code, String message, String path) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, List.of());
    }

    public static ApiErrorResponse of(
            int status,
            String code,
            String message,
            String path,
            List<FieldViolation> errors
    ) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, errors);
    }
}
