package com.delivery.auth.exception;

public class LoginIdentifierNotFoundException extends RuntimeException {

    public LoginIdentifierNotFoundException() {
        super("존재하지 않는 아이디입니다.");
    }
}
