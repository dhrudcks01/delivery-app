package com.delivery.notification.exception;

public class NotificationAccessDeniedException extends RuntimeException {

    public NotificationAccessDeniedException() {
        super("다른 사용자의 알림에는 접근할 수 없습니다.");
    }
}
