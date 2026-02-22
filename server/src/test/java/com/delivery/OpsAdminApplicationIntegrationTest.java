package com.delivery;

import com.delivery.auth.dto.CreateOpsAdminApplicationRequest;
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
class OpsAdminApplicationIntegrationTest {

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
    void userCanCreateOpsAdminApplication() throws Exception {
        TestUser user = createUser("apply-ops-user@example.com", "USER");

        String requestBody = objectMapper.writeValueAsString(new CreateOpsAdminApplicationRequest("운영 지원 업무를 수행하고 싶습니다."));
        mockMvc.perform(post("/user/ops-admin-applications")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reason").value("운영 지원 업무를 수행하고 싶습니다."))
                .andExpect(jsonPath("$.userEmail").value("apply-ops-user@example.com"))
                .andExpect(jsonPath("$.processedBy").isEmpty());
    }

    @Test
    void duplicatePendingApplicationReturnsConflict() throws Exception {
        TestUser user = createUser("duplicate-ops-user@example.com", "USER");
        String requestBody = objectMapper.writeValueAsString(new CreateOpsAdminApplicationRequest("중복 신청 테스트"));

        mockMvc.perform(post("/user/ops-admin-applications")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/user/ops-admin-applications")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OPS_ADMIN_APPLICATION_CONFLICT"));
    }

    @Test
    void sysAdminCanListApproveAndRejectOpsAdminApplications() throws Exception {
        TestUser sysAdmin = createUser("ops-sys-admin@example.com", "SYS_ADMIN");
        TestUser approveApplicant = createUser("ops-approve-user@example.com", "USER");
        TestUser rejectApplicant = createUser("ops-reject-driver@example.com", "DRIVER");

        Long approveApplicationId = createApplication(approveApplicant.accessToken(), "승인 대상 신청");
        Long rejectApplicationId = createApplication(rejectApplicant.accessToken(), "반려 대상 신청");

        mockMvc.perform(get("/sys-admin/ops-admin-applications")
                        .header("Authorization", "Bearer " + sysAdmin.accessToken())
                        .param("status", "PENDING")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].status").value("PENDING"));

        mockMvc.perform(post("/sys-admin/ops-admin-applications/{applicationId}/approve", approveApplicationId)
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.processedByEmail").value("ops-sys-admin@example.com"))
                .andExpect(jsonPath("$.processedAt").isNotEmpty());

        mockMvc.perform(get("/ops-admin/secure")
                        .header("Authorization", "Bearer " + approveApplicant.accessToken()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/sys-admin/ops-admin-applications/{applicationId}/reject", rejectApplicationId)
                        .header("Authorization", "Bearer " + sysAdmin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.processedByEmail").value("ops-sys-admin@example.com"))
                .andExpect(jsonPath("$.processedAt").isNotEmpty());
    }

    @Test
    void nonSysAdminCannotApproveOpsAdminApplication() throws Exception {
        TestUser opsAdmin = createUser("non-sys-ops@example.com", "OPS_ADMIN");
        TestUser applicant = createUser("non-sys-applicant@example.com", "USER");
        Long applicationId = createApplication(applicant.accessToken(), "권한 승인 시도");

        mockMvc.perform(post("/sys-admin/ops-admin-applications/{applicationId}/approve", applicationId)
                        .header("Authorization", "Bearer " + opsAdmin.accessToken()))
                .andExpect(status().isForbidden());
    }

    private Long createApplication(String accessToken, String reason) throws Exception {
        String requestBody = objectMapper.writeValueAsString(new CreateOpsAdminApplicationRequest(reason));
        String response = mockMvc.perform(post("/user/ops-admin-applications")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private TestUser createUser(String email, String roleCode) throws Exception {
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "권한신청테스터",
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
