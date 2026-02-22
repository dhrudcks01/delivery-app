package com.delivery.auth.web;

import com.delivery.auth.dto.OpsAdminGrantCandidateResponse;
import com.delivery.auth.dto.SysAdminGrantCandidateResponse;
import com.delivery.auth.service.RoleManagementService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sys-admin/users")
public class SysAdminRoleController {

    private final RoleManagementService roleManagementService;

    public SysAdminRoleController(RoleManagementService roleManagementService) {
        this.roleManagementService = roleManagementService;
    }

    @GetMapping("/ops-admin-grant-candidates")
    public ResponseEntity<Page<OpsAdminGrantCandidateResponse>> getOpsAdminGrantCandidates(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "userId", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(roleManagementService.getOpsAdminGrantCandidates(query, pageable));
    }

    @GetMapping("/sys-admin-grant-candidates")
    public ResponseEntity<Page<SysAdminGrantCandidateResponse>> getSysAdminGrantCandidates(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "userId", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(roleManagementService.getSysAdminGrantCandidates(query, pageable));
    }

    @PostMapping("/{userId}/roles/ops-admin")
    public ResponseEntity<Void> grantOpsAdmin(Authentication authentication, @PathVariable Long userId) {
        roleManagementService.grantOpsAdminRole(authentication.getName(), userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}/roles/ops-admin")
    public ResponseEntity<Void> revokeOpsAdmin(Authentication authentication, @PathVariable Long userId) {
        roleManagementService.revokeOpsAdminRole(authentication.getName(), userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/roles/sys-admin")
    public ResponseEntity<Void> grantSysAdmin(Authentication authentication, @PathVariable Long userId) {
        roleManagementService.grantSysAdminRole(authentication.getName(), userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}/roles/sys-admin")
    public ResponseEntity<Void> revokeSysAdmin(Authentication authentication, @PathVariable Long userId) {
        roleManagementService.revokeSysAdminRole(authentication.getName(), userId);
        return ResponseEntity.noContent().build();
    }
}
