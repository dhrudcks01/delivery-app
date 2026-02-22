package com.delivery.auth.exception;

public class OpsAdminApplicationNotAllowedException extends RuntimeException {

    public OpsAdminApplicationNotAllowedException() {
        super("OPS_ADMIN 권한 신청은 USER 또는 DRIVER만 가능합니다.");
    }
}
