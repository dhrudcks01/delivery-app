package com.delivery.payment.model;

public enum PaymentMethodType {
    CARD("TOSS"),
    TRANSFER_TOSS("TOSS"),
    KAKAOPAY("KAKAOPAY");

    private final String providerCode;

    PaymentMethodType(String providerCode) {
        this.providerCode = providerCode;
    }

    public String providerCode() {
        return providerCode;
    }

    public static PaymentMethodType fromNullable(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return CARD;
        }
        return PaymentMethodType.valueOf(rawValue.trim().toUpperCase());
    }
}
