package com.delivery.auth.exception;

public class PhoneNumberUpdateNotAllowedException extends RuntimeException {

    public PhoneNumberUpdateNotAllowedException() {
        super("휴대폰 번호는 본인인증으로만 변경할 수 있습니다.");
    }
}
