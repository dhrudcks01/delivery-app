package com.delivery.auth.web;

import com.delivery.auth.service.RoleManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sys-admin/users")
public class SysAdminRoleController {

    private final RoleManagementService roleManagementService;

    public SysAdminRoleController(RoleManagementService roleManagementService) {
        this.roleManagementService = roleManagementService;
    }

    @PostMapping("/{userId}/roles/ops-admin")
    public ResponseEntity<Void> grantOpsAdmin(@PathVariable Long userId) {
        roleManagementService.grantOpsAdminRole(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}/roles/ops-admin")
    public ResponseEntity<Void> revokeOpsAdmin(@PathVariable Long userId) {
        roleManagementService.revokeOpsAdminRole(userId);
        return ResponseEntity.noContent().build();
    }
}
