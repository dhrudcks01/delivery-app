package com.delivery.auth.web;

import com.delivery.auth.dto.CreateSysAdminApplicationRequest;
import com.delivery.auth.dto.SysAdminApplicationResponse;
import com.delivery.auth.service.SysAdminApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/sys-admin-applications")
public class UserSysAdminApplicationController {

    private final SysAdminApplicationService sysAdminApplicationService;

    public UserSysAdminApplicationController(SysAdminApplicationService sysAdminApplicationService) {
        this.sysAdminApplicationService = sysAdminApplicationService;
    }

    @PostMapping
    public ResponseEntity<SysAdminApplicationResponse> create(
            Authentication authentication,
            @Valid @RequestBody CreateSysAdminApplicationRequest request
    ) {
        SysAdminApplicationResponse response = sysAdminApplicationService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
