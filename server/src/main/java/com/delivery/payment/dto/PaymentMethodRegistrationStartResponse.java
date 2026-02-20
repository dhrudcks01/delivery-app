package com.delivery.payment.dto;

public record PaymentMethodRegistrationStartResponse(
        String customerKey,
        String registrationUrl
) {
}
