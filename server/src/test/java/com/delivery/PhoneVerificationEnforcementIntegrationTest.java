package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "app.phone-verification.enforcement-enabled=true")
class PhoneVerificationEnforcementIntegrationTest {

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

    @Test
    void loginAndRefreshIncludePhoneVerificationRequiredForUnverifiedUser() throws Exception {
        String email = "enforce-unverified@example.com";
        String password = "password123";
        createUserWithRole(email, password, "USER", false);

        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerificationRequired").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String refreshToken = objectMapper.readTree(loginResponse).get("refreshToken").asText();
        String refreshBody = objectMapper.writeValueAsString(new RefreshPayload(refreshToken));
        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerificationRequired").value(true));
    }

    @Test
    void protectedApiIsBlockedForUnverifiedUser() throws Exception {
        String email = "enforce-blocked@example.com";
        String password = "password123";
        createUserWithRole(email, password, "USER", false);

        String accessToken = issueAccessToken(email, password);
        mockMvc.perform(post("/user/payment-methods/registration/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PHONE_VERIFICATION_REQUIRED"));
    }

    @Test
    void phoneVerificationEndpointsAndMeAreAllowedForUnverifiedUser() throws Exception {
        String email = "enforce-allowed@example.com";
        String password = "password123";
        createUserWithRole(email, password, "USER", false);

        String accessToken = issueAccessToken(email, password);

        mockMvc.perform(get("/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/user/phone-verifications/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identityVerificationId").isNotEmpty());
    }

    @Test
    void verifiedUserCanAccessProtectedApiAndRbacStillWorks() throws Exception {
        String email = "enforce-verified@example.com";
        String password = "password123";
        createUserWithRole(email, password, "USER", true);

        String accessToken = issueAccessToken(email, password);

        mockMvc.perform(post("/user/payment-methods/registration/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registrationUrl").isNotEmpty());

        mockMvc.perform(get("/ops-admin/login-audit-logs")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    private void createUserWithRole(String email, String password, String roleCode, boolean verified) {
        UserEntity user = new UserEntity(
                email,
                passwordEncoder.encode(password),
                "phone verification guard user",
                "ACTIVE"
        );
        if (verified) {
            user.markPhoneVerified(
                    "+821012341234",
                    Instant.parse("2026-02-26T00:00:00Z"),
                    "PORTONE_DANAL",
                    "verified-" + email,
                    "ci-value".getBytes(),
                    "di-value".getBytes()
            );
        }
        UserEntity saved = userRepository.save(user);
        authIdentityRepository.save(new AuthIdentityEntity(saved, "LOCAL", email));
        ensureRole(roleCode);
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                saved.getId(),
                roleCode
        );
    }

    private void ensureRole(String roleCode) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM roles WHERE code = ?",
                Integer.class,
                roleCode
        );
        if (count == null || count == 0) {
            jdbcTemplate.update("INSERT INTO roles (code, description) VALUES (?, ?)", roleCode, roleCode + " role");
        }
    }

    private String issueAccessToken(String email, String password) throws Exception {
        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode jsonNode = objectMapper.readTree(loginResponse);
        return jsonNode.get("accessToken").asText();
    }

    private record LoginPayload(String email, String password) {
    }

    private record RefreshPayload(String refreshToken) {
    }
}
