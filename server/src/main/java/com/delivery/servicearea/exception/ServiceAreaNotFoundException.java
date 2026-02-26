package com.delivery.servicearea.exception;

public class ServiceAreaNotFoundException extends RuntimeException {

    public ServiceAreaNotFoundException() {
        super("서비스 지역을 찾을 수 없습니다.");
    }
}

