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
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MePhoneProfileIntegrationTest {

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
    void meReturnsMaskedPhoneFieldsForVerifiedUser() throws Exception {
        String email = "me-phone-user@example.com";
        String password = "password123";
        createVerifiedUserWithUserRole(email, password, "01012341234");
        String accessToken = issueAccessToken(email, password);

        mockMvc.perform(get("/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneNumber").value("010-****-1234"))
                .andExpect(jsonPath("$.phoneVerifiedAt").isNotEmpty())
                .andExpect(jsonPath("$.phoneVerificationProvider").value("PORTONE_DANAL"));
    }

    @Test
    void updateProfileRejectsPhoneNumberChange() throws Exception {
        String email = "profile-phone-reject@example.com";
        String password = "password123";
        createVerifiedUserWithUserRole(email, password, "01077778888");
        String accessToken = issueAccessToken(email, password);

        String body = objectMapper.writeValueAsString(new UpdateProfilePayload("new-name", "01099990000"));
        mockMvc.perform(patch("/user/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PHONE_NUMBER_UPDATE_NOT_ALLOWED"));
    }

    @Test
    void updateProfileAllowsDisplayNameWithoutPhoneChange() throws Exception {
        String email = "profile-display-update@example.com";
        String password = "password123";
        createVerifiedUserWithUserRole(email, password, "01055556666");
        String accessToken = issueAccessToken(email, password);

        String body = objectMapper.writeValueAsString(new UpdateProfilePayload("updated-name", null));
        mockMvc.perform(patch("/user/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("updated-name"))
                .andExpect(jsonPath("$.phoneNumber").value("010-****-6666"))
                .andExpect(jsonPath("$.phoneVerificationProvider").value("PORTONE_DANAL"));
    }

    private void createVerifiedUserWithUserRole(String email, String password, String localPhone) {
        UserEntity user = new UserEntity(
                email,
                passwordEncoder.encode(password),
                "default-name",
                "ACTIVE"
        );
        user.markPhoneVerified(
                normalizeToE164(localPhone),
                Instant.parse("2026-02-26T00:00:00Z"),
                "PORTONE_DANAL",
                "identity-" + email,
                "ci-value".getBytes(),
                "di-value".getBytes()
        );
        UserEntity saved = userRepository.save(user);
        authIdentityRepository.save(new AuthIdentityEntity(saved, "LOCAL", email));
        ensureRole("USER");
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                saved.getId(),
                "USER"
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
        JsonNode loginJson = objectMapper.readTree(loginResponse);
        return loginJson.get("accessToken").asText();
    }

    private String normalizeToE164(String localPhone) {
        String digits = localPhone.replaceAll("[^0-9]", "");
        if (digits.startsWith("0") && digits.length() > 1) {
            return "+82" + digits.substring(1);
        }
        return "+" + digits;
    }

    private record LoginPayload(String email, String password) {
    }

    private record UpdateProfilePayload(String displayName, String phoneNumber) {
    }
}
