package com.delivery.driver.exception;

public class DriverApplicationStatusConflictException extends RuntimeException {

    public DriverApplicationStatusConflictException() {
        super("처리할 수 없는 기사 신청 상태입니다.");
    }
}
