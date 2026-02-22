package com.delivery.auth.exception;

public class SysAdminSelfRoleChangeNotAllowedException extends RuntimeException {

    public SysAdminSelfRoleChangeNotAllowedException() {
        super("자기 자신의 SYS_ADMIN 권한은 직접 변경할 수 없습니다.");
    }
}
