package com.delivery.auth.exception;

public class SysAdminGrantTargetNotAllowedException extends RuntimeException {

    public SysAdminGrantTargetNotAllowedException() {
        super("SYS_ADMIN 권한은 SYS_ADMIN 미보유 사용자에게만 부여할 수 있습니다.");
    }
}
