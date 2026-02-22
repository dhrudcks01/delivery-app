package com.delivery.auth.exception;

public class SysAdminApplicationNotFoundException extends RuntimeException {

    public SysAdminApplicationNotFoundException() {
        super("SYS_ADMIN 권한 신청을 찾을 수 없습니다.");
    }
}
