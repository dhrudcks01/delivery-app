package com.delivery.waste.exception;

public class WasteRequestAccessDeniedException extends RuntimeException {

    public WasteRequestAccessDeniedException() {
        super("다른 사용자의 수거 요청에는 접근할 수 없습니다.");
    }
}
