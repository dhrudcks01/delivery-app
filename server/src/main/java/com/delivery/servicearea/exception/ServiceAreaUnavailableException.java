package com.delivery.servicearea.exception;

import org.springframework.http.HttpStatus;

public class ServiceAreaUnavailableException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    private ServiceAreaUnavailableException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static ServiceAreaUnavailableException notWhitelisted(String city, String district, String dong) {
        return new ServiceAreaUnavailableException(
                HttpStatus.BAD_REQUEST,
                "SERVICE_AREA_UNAVAILABLE",
                "서비스 가능 지역이 아닙니다. (city=%s, district=%s, dong=%s)".formatted(city, district, dong)
        );
    }

    public static ServiceAreaUnavailableException unresolvedAddress() {
        return new ServiceAreaUnavailableException(
                HttpStatus.BAD_REQUEST,
                "SERVICE_AREA_ADDRESS_UNRESOLVED",
                "주소에서 서비스지역(동)을 판별할 수 없습니다."
        );
    }

    public static ServiceAreaUnavailableException matchingUnavailable() {
        return new ServiceAreaUnavailableException(
                HttpStatus.BAD_GATEWAY,
                "SERVICE_AREA_MATCHING_UNAVAILABLE",
                "주소 매칭 보정 서비스가 일시적으로 사용 불가합니다."
        );
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
