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
        upsertRole("OPS_ADMIN", "운영 관리자");
        upsertRole("SYS_ADMIN", "시스템 관리자");
    }

    @Test
    void sysAdminCanGrantAndRevokeOpsAdminRole() throws Exception {
        TestUser sysAdmin = createUser("sys-admin@example.com", "SYS_ADMIN");
        TestUser target = createUser("target-user@example.com", "USER");

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
    void nonSysAdminCannotGrantOpsAdminRole() throws Exception {
        TestUser opsAdmin = createUser("ops-admin@example.com", "OPS_ADMIN");
        TestUser target = createUser("target-non-sys@example.com", "USER");

        mockMvc.perform(post("/sys-admin/users/{userId}/roles/ops-admin", target.id())
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isForbidden());
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
                        .param("query", "driver")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].userId").value(driverOnly.id()))
                .andExpect(jsonPath("$.content[0].userEmail").value("driver-only@example.com"));
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
