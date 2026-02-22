package com.delivery.driver.web;

import com.delivery.driver.dto.DriverApplicationResponse;
import com.delivery.driver.service.DriverApplicationService;
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
@RequestMapping("/ops-admin/driver-applications")
public class OpsAdminDriverApplicationController {

    private final DriverApplicationService driverApplicationService;

    public OpsAdminDriverApplicationController(DriverApplicationService driverApplicationService) {
        this.driverApplicationService = driverApplicationService;
    }

    @GetMapping
    public ResponseEntity<Page<DriverApplicationResponse>> getApplications(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(driverApplicationService.getApplicationsForOps(status, pageable));
    }

    @PostMapping("/{applicationId}/approve")
    public ResponseEntity<DriverApplicationResponse> approve(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(driverApplicationService.approve(authentication.getName(), applicationId));
    }

    @PostMapping("/{applicationId}/reject")
    public ResponseEntity<DriverApplicationResponse> reject(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(driverApplicationService.reject(authentication.getName(), applicationId));
    }
}
