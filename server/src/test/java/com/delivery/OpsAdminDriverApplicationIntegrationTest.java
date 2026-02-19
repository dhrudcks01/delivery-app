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
                .andExpect(jsonPath("$.processedBy").isNumber())
                .andExpect(jsonPath("$.processedAt").isNotEmpty());
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
                .andExpect(jsonPath("$.processedBy").isNumber())
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
