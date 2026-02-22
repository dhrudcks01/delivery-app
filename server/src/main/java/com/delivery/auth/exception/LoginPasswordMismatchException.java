package com.delivery.auth.exception;

public class LoginPasswordMismatchException extends RuntimeException {

    public LoginPasswordMismatchException() {
        super("비밀번호가 올바르지 않습니다.");
    }
}
