package com.delivery.servicearea.exception;

public class ServiceAreaUnavailableException extends RuntimeException {

    public ServiceAreaUnavailableException() {
        super("서비스 가능 지역이 아닙니다.");
    }
}

