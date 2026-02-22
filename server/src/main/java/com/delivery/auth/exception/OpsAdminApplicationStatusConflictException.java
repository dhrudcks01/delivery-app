package com.delivery.auth.exception;

public class OpsAdminApplicationStatusConflictException extends RuntimeException {

    public OpsAdminApplicationStatusConflictException() {
        super("이미 처리된 OPS_ADMIN 권한 신청입니다.");
    }
}
