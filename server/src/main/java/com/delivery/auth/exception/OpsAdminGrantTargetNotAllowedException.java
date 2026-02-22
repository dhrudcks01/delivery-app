package com.delivery.auth.exception;

public class OpsAdminGrantTargetNotAllowedException extends RuntimeException {

    public OpsAdminGrantTargetNotAllowedException() {
        super("OPS_ADMIN 권한은 DRIVER 권한 보유자 중 OPS_ADMIN 미보유 사용자에게만 부여할 수 있습니다.");
    }
}
