package com.delivery.useraddress.exception;

public class UserAddressNotFoundException extends RuntimeException {
    public UserAddressNotFoundException() {
        super("사용자 주소를 찾을 수 없습니다.");
    }
}

