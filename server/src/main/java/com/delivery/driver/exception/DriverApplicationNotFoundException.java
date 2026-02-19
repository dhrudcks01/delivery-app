package com.delivery.driver.exception;

public class DriverApplicationNotFoundException extends RuntimeException {

    public DriverApplicationNotFoundException() {
        super("기사 신청 정보를 찾을 수 없습니다.");
    }
}
