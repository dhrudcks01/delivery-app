package com.delivery.payment.exception;

public class PaymentRetryConflictException extends RuntimeException {

    public PaymentRetryConflictException(String message) {
        super(message);
    }
}
