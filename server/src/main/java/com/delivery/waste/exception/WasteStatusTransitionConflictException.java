package com.delivery.waste.exception;

public class WasteStatusTransitionConflictException extends RuntimeException {

    public WasteStatusTransitionConflictException() {
        super("허용되지 않는 수거 요청 상태 전이입니다.");
    }
}
