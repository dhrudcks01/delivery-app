package com.delivery.servicearea.exception;

public class ServiceAreaMasterDongNotFoundException extends RuntimeException {

    public ServiceAreaMasterDongNotFoundException() {
        super("행정구역 마스터 코드를 찾을 수 없습니다.");
    }
}
