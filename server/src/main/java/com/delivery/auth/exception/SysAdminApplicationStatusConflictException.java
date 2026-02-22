package com.delivery.auth.exception;

public class SysAdminApplicationStatusConflictException extends RuntimeException {

    public SysAdminApplicationStatusConflictException() {
        super("이미 처리된 SYS_ADMIN 권한 신청입니다.");
    }
}
