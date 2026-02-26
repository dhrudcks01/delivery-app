package com.delivery.web.error;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        List<FieldViolation> errors,
        String requestId
) {

    public record FieldViolation(String field, String message) {
    }

    public static ApiErrorResponse of(int status, String code, String message, String path) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, List.of(), null);
    }

    public static ApiErrorResponse of(
            int status,
            String code,
            String message,
            String path,
            List<FieldViolation> errors
    ) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, errors, null);
    }

    public static ApiErrorResponse of(int status, String code, String message, String path, String requestId) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, List.of(), requestId);
    }

    public static ApiErrorResponse of(
            int status,
            String code,
            String message,
            String path,
            List<FieldViolation> errors,
            String requestId
    ) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, errors, requestId);
    }
}
