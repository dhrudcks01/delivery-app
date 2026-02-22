package com.delivery.auth.exception;

public class SysAdminApplicationNotAllowedException extends RuntimeException {

    public SysAdminApplicationNotAllowedException() {
        super("SYS_ADMIN 권한 신청은 OPS_ADMIN 권한 사용자만 가능합니다.");
    }
}
