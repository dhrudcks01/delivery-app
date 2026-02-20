package com.delivery.payment.exception;

public class InvalidPaymentMethodRegistrationException extends RuntimeException {

    public InvalidPaymentMethodRegistrationException(String message) {
        super(message);
    }
}
