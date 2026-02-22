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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpsAdminDriverApplicationIntegrationTest {

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
        upsertRole("DRIVER", "기사");
    }

    @Test
    void opsAdminCanApproveApplication() throws Exception {
        String userAccessToken = createUserAndLogin("apply-user@example.com", "USER");
        String opsAdminAccessToken = createUserAndLogin("ops-admin@example.com", "OPS_ADMIN");
        Long applicationId = createApplication(userAccessToken);

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/approve", applicationId)
                        .header("Authorization", "Bearer " + opsAdminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.userEmail").value("apply-user@example.com"))
                .andExpect(jsonPath("$.processedBy").isNumber())
                .andExpect(jsonPath("$.processedByEmail").value("ops-admin@example.com"))
                .andExpect(jsonPath("$.processedAt").isNotEmpty());

        mockMvc.perform(get("/driver/secure")
                        .header("Authorization", "Bearer " + userAccessToken))
                .andExpect(status().isOk());
    }

    @Test
    void opsAdminCanRejectApplication() throws Exception {
        String userAccessToken = createUserAndLogin("reject-user@example.com", "USER");
        String opsAdminAccessToken = createUserAndLogin("reject-admin@example.com", "OPS_ADMIN");
        Long applicationId = createApplication(userAccessToken);

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/reject", applicationId)
                        .header("Authorization", "Bearer " + opsAdminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.userEmail").value("reject-user@example.com"))
                .andExpect(jsonPath("$.processedBy").isNumber())
                .andExpect(jsonPath("$.processedByEmail").value("reject-admin@example.com"))
                .andExpect(jsonPath("$.processedAt").isNotEmpty());

        mockMvc.perform(get("/driver/secure")
                        .header("Authorization", "Bearer " + userAccessToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void sysAdminCanApproveAndRejectApplication() throws Exception {
        String approveUserToken = createUserAndLogin("sys-approve-user@example.com", "USER");
        String rejectUserToken = createUserAndLogin("sys-reject-user@example.com", "USER");
        String sysAdminAccessToken = createUserAndLogin("sys-admin-reviewer@example.com", "SYS_ADMIN");

        Long approveApplicationId = createApplication(approveUserToken);
        Long rejectApplicationId = createApplication(rejectUserToken);

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/approve", approveApplicationId)
                        .header("Authorization", "Bearer " + sysAdminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.processedByEmail").value("sys-admin-reviewer@example.com"))
                .andExpect(jsonPath("$.processedAt").isNotEmpty());

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/reject", rejectApplicationId)
                        .header("Authorization", "Bearer " + sysAdminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.processedByEmail").value("sys-admin-reviewer@example.com"))
                .andExpect(jsonPath("$.processedAt").isNotEmpty());
    }

    @Test
    void userCannotApproveApplication() throws Exception {
        String userAccessToken = createUserAndLogin("normal-user@example.com", "USER");
        Long applicationId = createApplication(userAccessToken);

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/approve", applicationId)
                        .header("Authorization", "Bearer " + userAccessToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void alreadyProcessedApplicationReturnsConflict() throws Exception {
        String userAccessToken = createUserAndLogin("processed-user@example.com", "USER");
        String opsAdminAccessToken = createUserAndLogin("processed-admin@example.com", "OPS_ADMIN");
        Long applicationId = createApplication(userAccessToken);

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/approve", applicationId)
                        .header("Authorization", "Bearer " + opsAdminAccessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/reject", applicationId)
                        .header("Authorization", "Bearer " + opsAdminAccessToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DRIVER_APPLICATION_STATUS_CONFLICT"));
    }

    @Test
    void opsAdminCanListApplicationsWithStatusFilterAndPagination() throws Exception {
        String pendingUserToken = createUserAndLogin("pending-user@example.com", "USER");
        String approvedUserToken = createUserAndLogin("approved-user@example.com", "USER");
        String opsAdminAccessToken = createUserAndLogin("ops-list-admin@example.com", "OPS_ADMIN");

        Long approvedApplicationId = createApplication(approvedUserToken);
        createApplication(pendingUserToken);

        mockMvc.perform(post("/ops-admin/driver-applications/{applicationId}/approve", approvedApplicationId)
                        .header("Authorization", "Bearer " + opsAdminAccessToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/ops-admin/driver-applications")
                        .header("Authorization", "Bearer " + opsAdminAccessToken)
                        .param("status", "PENDING")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sort", "createdAt,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("PENDING"))
                .andExpect(jsonPath("$.content[0].userEmail").value("pending-user@example.com"))
                .andExpect(jsonPath("$.content[0].processedAt").isEmpty())
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(10));
    }

    @Test
    void opsAdminListUsesCreatedAtDescByDefault() throws Exception {
        String firstUserToken = createUserAndLogin("first-order-user@example.com", "USER");
        String secondUserToken = createUserAndLogin("second-order-user@example.com", "USER");
        String opsAdminAccessToken = createUserAndLogin("ops-order-admin@example.com", "OPS_ADMIN");

        Long firstApplicationId = createApplication(firstUserToken);
        Long secondApplicationId = createApplication(secondUserToken);

        mockMvc.perform(get("/ops-admin/driver-applications")
                        .header("Authorization", "Bearer " + opsAdminAccessToken)
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(secondApplicationId))
                .andExpect(jsonPath("$.content[1].id").value(firstApplicationId))
                .andExpect(jsonPath("$.content[0].userEmail").value("second-order-user@example.com"))
                .andExpect(jsonPath("$.content[0].processedBy").isEmpty());
    }

    private Long createApplication(String accessToken) throws Exception {
        String body = """
                {
                  "payload": {
                    "careerYears": 2
                  }
                }
                """;
        String response = mockMvc.perform(post("/user/driver-applications")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private String createUserAndLogin(String email, String roleCode) throws Exception {
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "기사신청테스터",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                user.getId(),
                roleCode
        );

        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(loginResponse).get("accessToken").asText();
    }

    private void upsertRole(String code, String description) {
        jdbcTemplate.update("MERGE INTO roles (code, description) KEY(code) VALUES (?, ?)", code, description);
    }

    private record LoginPayload(String email, String password) {
    }
}
