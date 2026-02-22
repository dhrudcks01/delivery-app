package com.delivery.auth.web;

import com.delivery.auth.dto.SysAdminApplicationResponse;
import com.delivery.auth.service.SysAdminApplicationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sys-admin/sys-admin-applications")
public class SysAdminSysAdminApplicationController {

    private final SysAdminApplicationService sysAdminApplicationService;

    public SysAdminSysAdminApplicationController(SysAdminApplicationService sysAdminApplicationService) {
        this.sysAdminApplicationService = sysAdminApplicationService;
    }

    @GetMapping
    public ResponseEntity<Page<SysAdminApplicationResponse>> getApplications(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(sysAdminApplicationService.getApplicationsForSysAdmin(status, pageable));
    }

    @PostMapping("/{applicationId}/approve")
    public ResponseEntity<SysAdminApplicationResponse> approve(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(sysAdminApplicationService.approve(authentication.getName(), applicationId));
    }

    @PostMapping("/{applicationId}/reject")
    public ResponseEntity<SysAdminApplicationResponse> reject(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(sysAdminApplicationService.reject(authentication.getName(), applicationId));
    }
}
