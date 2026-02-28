package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpsAdminRoleManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthIdentityRepository authIdentityRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUpRoles() {
        upsertRole("USER", "일반 사용자");
        upsertRole("DRIVER", "기사");
        upsertRole("OPS_ADMIN", "운영 관리자");
        upsertRole("SYS_ADMIN", "시스템 관리자");
    }

    @Test
    void sysAdminCanGrantAndRevokeOpsAdminRole() throws Exception {
        TestUser sysAdmin = createUser("sys-admin@example.com", "SYS_ADMIN");
        TestUser target = createUser("target-user@example.com", "DRIVER");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/ops-admin", target.id())
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/ops-admin/secure")
                        .header("Authorization", "Bearer " + target.accessToken()))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/sys-admin/users/{userId}/roles/ops-admin", target.id())
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/ops-admin/secure")
                        .header("Authorization", "Bearer " + target.accessToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void driverCannotGrantOpsAdminRole() throws Exception {
        TestUser driver = createUser("driver-no-access@example.com", "DRIVER");
        TestUser target = createUser("target-non-admin@example.com", "DRIVER");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/ops-admin", target.id())
                        .header("Authorization", "Bearer " + driver.accessToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void opsAdminCanSearchAndGrantOpsAdminRole() throws Exception {
        TestUser opsAdmin = createUser("ops-admin-granter@example.com", "OPS_ADMIN");
        TestUser targetDriver = createUser("driver-target@example.com", "DRIVER");

        mockMvc.perform(get("/sys-admin/users/ops-admin-grant-candidates")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .param("query", "driver-target")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].userId").value(targetDriver.id()));

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/ops-admin", targetDriver.id())
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isNoContent());
    }

    @Test
    void grantReturnsNotFoundWhenUserDoesNotExist() throws Exception {
        TestUser sysAdmin = createUser("sys-admin-not-found@example.com", "SYS_ADMIN");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/ops-admin", 999999L)
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void sysAdminCanSearchOpsAdminGrantCandidatesWithDriverCondition() throws Exception {
        TestUser sysAdmin = createUser("sys-admin-search@example.com", "SYS_ADMIN");
        TestUser driverOnly = createUser("driver-only@example.com", "DRIVER");
        TestUser driverAndOps = createUser("driver-ops@example.com", "DRIVER");
        assignRole(driverAndOps.id(), "OPS_ADMIN");
        createUser("user-only@example.com", "USER");

        mockMvc.perform(get("/sys-admin/users/ops-admin-grant-candidates")
                        .header("Authorization", "Bearer " + sysAdmin.accessToken())
                        .param("query", "driver-only@example.com")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].userId").value(driverOnly.id()))
                .andExpect(jsonPath("$.content[0].loginId").value("driver-only@example.com"))
                .andExpect(jsonPath("$.content[0].name").value("권한테스터"));
    }

    @Test
    void sysAdminCanSearchAndGrantSysAdminRoleToNonSysAdminUser() throws Exception {
        TestUser sysAdmin = createUser("sys-admin-grant@example.com", "SYS_ADMIN");
        TestUser target = createUser("sys-target@example.com", "OPS_ADMIN");

        mockMvc.perform(get("/sys-admin/users/sys-admin-grant-candidates")
                        .header("Authorization", "Bearer " + sysAdmin.accessToken())
                        .param("query", "sys-target")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].userId").value(target.id()))
                .andExpect(jsonPath("$.content[0].loginId").value("sys-target@example.com"))
                .andExpect(jsonPath("$.content[0].name").value("권한테스터"));

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/sys-admin", target.id())
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/sys-admin/secure")
                        .header("Authorization", "Bearer " + target.accessToken()))
                .andExpect(status().isOk());
    }

    @Test
    void sysAdminCannotGrantOrRevokeOwnSysAdminRole() throws Exception {
        TestUser selfSysAdmin = createUser("self-sys-admin@example.com", "SYS_ADMIN");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/sys-admin", selfSysAdmin.id())
                        .header("Authorization", "Bearer " + selfSysAdmin.accessToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SYS_ADMIN_SELF_ROLE_CHANGE_NOT_ALLOWED"));

        mockMvc.perform(delete("/sys-admin/users/{userId}/roles/sys-admin", selfSysAdmin.id())
                        .header("Authorization", "Bearer " + selfSysAdmin.accessToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SYS_ADMIN_SELF_ROLE_CHANGE_NOT_ALLOWED"));
    }

    @Test
    void grantSysAdminRoleFailsWhenTargetAlreadyHasSysAdmin() throws Exception {
        TestUser actor = createUser("sys-grant-actor@example.com", "SYS_ADMIN");
        TestUser targetSysAdmin = createUser("sys-grant-target@example.com", "SYS_ADMIN");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/sys-admin", targetSysAdmin.id())
                        .header("Authorization", "Bearer " + actor.accessToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SYS_ADMIN_GRANT_TARGET_NOT_ALLOWED"));
    }

    @Test
    void sysAdminRoleChangesAreRecordedInAuditLog() throws Exception {
        TestUser actor = createUser("sys-audit-actor@example.com", "SYS_ADMIN");
        TestUser target = createUser("sys-audit-target@example.com", "OPS_ADMIN");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/sys-admin", target.id())
                        .header("Authorization", "Bearer " + actor.accessToken()))
                .andExpect(status().isNoContent());

        Integer grantCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM role_change_audit_logs
                WHERE actor_user_id = ?
                  AND target_user_id = ?
                  AND role_code = 'SYS_ADMIN'
                  AND action = 'GRANT'
                """,
                Integer.class,
                actor.id(),
                target.id()
        );
        org.assertj.core.api.Assertions.assertThat(grantCount).isNotNull();
        org.assertj.core.api.Assertions.assertThat(grantCount).isGreaterThanOrEqualTo(1);
    }

    @Test
    void grantOpsAdminRoleFailsWhenTargetIsNotEligibleDriver() throws Exception {
        TestUser sysAdmin = createUser("sys-admin-validation@example.com", "SYS_ADMIN");
        TestUser userOnly = createUser("user-no-driver@example.com", "USER");
        TestUser driverAndOps = createUser("driver-with-ops@example.com", "DRIVER");
        assignRole(driverAndOps.id(), "OPS_ADMIN");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/ops-admin", userOnly.id())
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OPS_ADMIN_GRANT_TARGET_NOT_ALLOWED"));

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/ops-admin", driverAndOps.id())
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OPS_ADMIN_GRANT_TARGET_NOT_ALLOWED"));
    }

    private TestUser createUser(String email, String roleCode) throws Exception {
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "권한테스터",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        assignRole(user.getId(), roleCode);
        return new TestUser(user.getId(), login(email, password));
    }

    private String login(String email, String password) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String response = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    private void upsertRole(String code, String description) {
        jdbcTemplate.update("MERGE INTO roles (code, description) KEY(code) VALUES (?, ?)", code, description);
    }

    private void assignRole(Long userId, String roleCode) {
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, r.id
                FROM roles r
                WHERE r.code = ?
                """,
                userId, roleCode
        );
    }

    private record LoginPayload(String email, String password) {
    }

    private record TestUser(Long id, String accessToken) {
    }
}
