package com.delivery.waste.exception;

public class DriverRoleRequiredException extends RuntimeException {

    public DriverRoleRequiredException() {
        super("배정 대상 사용자는 DRIVER 역할이 필요합니다.");
    }
}
