package com.delivery.auth.exception;

public class OpsAdminApplicationNotFoundException extends RuntimeException {

    public OpsAdminApplicationNotFoundException() {
        super("OPS_ADMIN 권한 신청을 찾을 수 없습니다.");
    }
}
