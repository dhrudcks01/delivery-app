package com.delivery.waste.exception;

public class WasteRequestNotFoundException extends RuntimeException {

    public WasteRequestNotFoundException() {
        super("수거 요청을 찾을 수 없습니다.");
    }
}
