package com.delivery.auth.exception;

public class SysAdminSelfApprovalNotAllowedException extends RuntimeException {

    public SysAdminSelfApprovalNotAllowedException() {
        super("자기 자신의 SYS_ADMIN 권한 신청은 승인할 수 없습니다.");
    }
}
