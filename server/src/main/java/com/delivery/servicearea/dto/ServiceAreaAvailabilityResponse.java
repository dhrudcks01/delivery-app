package com.delivery.servicearea.dto;

public record ServiceAreaAvailabilityResponse(
        boolean available,
        String reasonCode,
        String message,
        String city,
        String district,
        String dong
) {
}

