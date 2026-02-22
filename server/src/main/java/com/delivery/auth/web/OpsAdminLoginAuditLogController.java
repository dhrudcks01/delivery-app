package com.delivery.auth.web;

import com.delivery.auth.dto.LoginAuditLogResponse;
import com.delivery.auth.service.LoginAuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ops-admin/login-audit-logs")
public class OpsAdminLoginAuditLogController {

    private final LoginAuditLogService loginAuditLogService;

    public OpsAdminLoginAuditLogController(LoginAuditLogService loginAuditLogService) {
        this.loginAuditLogService = loginAuditLogService;
    }

    @GetMapping
    public ResponseEntity<Page<LoginAuditLogResponse>> getLogs(
            @RequestParam(required = false) String identifier,
            @RequestParam(required = false) String result,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(loginAuditLogService.getLogs(identifier, result, pageable));
    }
}
