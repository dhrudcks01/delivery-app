package com.delivery.auth.web;

import com.delivery.auth.dto.OpsAdminApplicationResponse;
import com.delivery.auth.service.OpsAdminApplicationService;
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
@RequestMapping("/sys-admin/ops-admin-applications")
public class SysAdminOpsAdminApplicationController {

    private final OpsAdminApplicationService opsAdminApplicationService;

    public SysAdminOpsAdminApplicationController(OpsAdminApplicationService opsAdminApplicationService) {
        this.opsAdminApplicationService = opsAdminApplicationService;
    }

    @GetMapping
    public ResponseEntity<Page<OpsAdminApplicationResponse>> getApplications(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(opsAdminApplicationService.getApplicationsForSysAdmin(status, pageable));
    }

    @PostMapping("/{applicationId}/approve")
    public ResponseEntity<OpsAdminApplicationResponse> approve(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(opsAdminApplicationService.approve(authentication.getName(), applicationId));
    }

    @PostMapping("/{applicationId}/reject")
    public ResponseEntity<OpsAdminApplicationResponse> reject(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(opsAdminApplicationService.reject(authentication.getName(), applicationId));
    }
}
