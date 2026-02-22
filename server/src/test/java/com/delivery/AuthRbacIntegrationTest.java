package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
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

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthRbacIntegrationTest {

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
    void userRoleCanAccessUserEndpointButIsForbiddenFromDriverEndpoint() throws Exception {
        String token = createAccessToken("auth-rbac-user@example.com", List.of("USER"));

        mockMvc.perform(get("/user/secure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/driver/secure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void driverAndOpsAdminMultiRoleUserCanAccessBothAndMeReturnsRoles() throws Exception {
        String token = createAccessToken("auth-rbac-multi@example.com", List.of("DRIVER", "OPS_ADMIN"));

        mockMvc.perform(get("/driver/secure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/ops-admin/secure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/sys-admin/secure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("auth-rbac-multi@example.com"))
                .andExpect(jsonPath("$.roles[0]").value("DRIVER"))
                .andExpect(jsonPath("$.roles[1]").value("OPS_ADMIN"));
    }

    @Test
    void refreshedAccessTokenStillFollowsRbacRules() throws Exception {
        String email = "auth-rbac-refresh@example.com";
        String password = "password123";
        createUser(email, password, List.of("OPS_ADMIN"));

        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode loginJson = objectMapper.readTree(loginResponse);

        String refreshBody = objectMapper.writeValueAsString(new RefreshPayload(loginJson.get("refreshToken").asText()));
        String refreshResponse = mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String refreshedAccessToken = objectMapper.readTree(refreshResponse).get("accessToken").asText();

        mockMvc.perform(get("/ops-admin/secure")
                        .header("Authorization", "Bearer " + refreshedAccessToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/sys-admin/secure")
                        .header("Authorization", "Bearer " + refreshedAccessToken))
                .andExpect(status().isForbidden());
    }

    private String createAccessToken(String email, List<String> roles) throws Exception {
        String password = "password123";
        createUser(email, password, roles);
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

    private void createUser(String email, String password, List<String> roles) {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "AuthRbac테스터",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        roles.forEach(role -> assignRole(user.getId(), role));
    }

    private void upsertRole(String code, String description) {
        jdbcTemplate.update("MERGE INTO roles (code, description) KEY(code) VALUES (?, ?)", code, description);
    }

    private void assignRole(Long userId, String roleCode) {
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                userId,
                roleCode
        );
    }

    private record LoginPayload(String email, String password) {
    }

    private record RefreshPayload(String refreshToken) {
    }
}
