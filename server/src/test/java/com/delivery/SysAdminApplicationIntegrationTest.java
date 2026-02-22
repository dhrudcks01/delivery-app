package com.delivery;

import com.delivery.auth.dto.CreateSysAdminApplicationRequest;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SysAdminApplicationIntegrationTest {

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
    void opsAdminCanCreateSysAdminApplication() throws Exception {
        TestUser opsAdmin = createUser("sys-apply-ops@example.com", "OPS_ADMIN");
        String requestBody = objectMapper.writeValueAsString(new CreateSysAdminApplicationRequest("시스템 권한 신청 사유"));

        mockMvc.perform(post("/user/sys-admin-applications")
                        .header("Authorization", "Bearer " + opsAdmin.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reason").value("시스템 권한 신청 사유"))
                .andExpect(jsonPath("$.userEmail").value("sys-apply-ops@example.com"))
                .andExpect(jsonPath("$.processedBy").isEmpty());
    }

    @Test
    void nonOpsAdminCannotCreateSysAdminApplication() throws Exception {
        TestUser user = createUser("sys-apply-user@example.com", "USER");
        String requestBody = objectMapper.writeValueAsString(new CreateSysAdminApplicationRequest("권한 신청"));

        mockMvc.perform(post("/user/sys-admin-applications")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SYS_ADMIN_APPLICATION_NOT_ALLOWED"));
    }

    @Test
    void sysAdminCanListApproveAndRejectSysAdminApplications() throws Exception {
        TestUser sysAdmin = createUser("sys-reviewer@example.com", "SYS_ADMIN");
        TestUser approveApplicant = createUser("sys-approve-ops@example.com", "OPS_ADMIN");
        TestUser rejectApplicant = createUser("sys-reject-ops@example.com", "OPS_ADMIN");

        Long approveApplicationId = createApplication(approveApplicant.accessToken(), "승인 대상");
        Long rejectApplicationId = createApplication(rejectApplicant.accessToken(), "반려 대상");

        mockMvc.perform(get("/sys-admin/sys-admin-applications")
                        .header("Authorization", "Bearer " + sysAdmin.accessToken())
                        .param("status", "PENDING")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));

        mockMvc.perform(post("/sys-admin/sys-admin-applications/{applicationId}/approve", approveApplicationId)
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.processedByEmail").value("sys-reviewer@example.com"))
                .andExpect(jsonPath("$.processedAt").isNotEmpty());

        mockMvc.perform(get("/sys-admin/secure")
                        .header("Authorization", "Bearer " + approveApplicant.accessToken()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/sys-admin/sys-admin-applications/{applicationId}/reject", rejectApplicationId)
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.processedByEmail").value("sys-reviewer@example.com"));
    }

    @Test
    void cannotSelfApproveSysAdminApplication() throws Exception {
        TestUser selfUser = createUser("self-approve@example.com", "SYS_ADMIN");
        Long applicationId = insertPendingApplication(selfUser.id(), "자기 승인 테스트");

        mockMvc.perform(post("/sys-admin/sys-admin-applications/{applicationId}/approve", applicationId)
                        .header("Authorization", "Bearer " + selfUser.accessToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SYS_ADMIN_SELF_APPROVAL_NOT_ALLOWED"));
    }

    private Long createApplication(String accessToken, String reason) throws Exception {
        String requestBody = objectMapper.writeValueAsString(new CreateSysAdminApplicationRequest(reason));
        String response = mockMvc.perform(post("/user/sys-admin-applications")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private Long insertPendingApplication(Long userId, String reason) {
        jdbcTemplate.update(
                """
                INSERT INTO sys_admin_applications (user_id, status, reason)
                VALUES (?, 'PENDING', ?)
                """,
                userId,
                reason
        );
        return jdbcTemplate.queryForObject(
                "SELECT MAX(id) FROM sys_admin_applications WHERE user_id = ?",
                Long.class,
                userId
        );
    }

    private TestUser createUser(String email, String roleCode) throws Exception {
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "시스템권한테스터",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        assignRole(user.getId(), roleCode);
        if (!"USER".equals(roleCode)) {
            assignRole(user.getId(), "USER");
        }
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
