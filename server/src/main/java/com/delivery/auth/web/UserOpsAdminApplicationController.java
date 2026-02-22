package com.delivery.auth.web;

import com.delivery.auth.dto.CreateOpsAdminApplicationRequest;
import com.delivery.auth.dto.OpsAdminApplicationResponse;
import com.delivery.auth.service.OpsAdminApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/ops-admin-applications")
public class UserOpsAdminApplicationController {

    private final OpsAdminApplicationService opsAdminApplicationService;

    public UserOpsAdminApplicationController(OpsAdminApplicationService opsAdminApplicationService) {
        this.opsAdminApplicationService = opsAdminApplicationService;
    }

    @PostMapping
    public ResponseEntity<OpsAdminApplicationResponse> create(
            Authentication authentication,
            @Valid @RequestBody CreateOpsAdminApplicationRequest request
    ) {
        OpsAdminApplicationResponse response = opsAdminApplicationService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
