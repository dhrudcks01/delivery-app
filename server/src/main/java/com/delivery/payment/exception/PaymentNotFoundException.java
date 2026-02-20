package com.delivery.payment.exception;

public class PaymentNotFoundException extends RuntimeException {

    public PaymentNotFoundException() {
        super("결제 정보를 찾을 수 없습니다.");
    }
}
