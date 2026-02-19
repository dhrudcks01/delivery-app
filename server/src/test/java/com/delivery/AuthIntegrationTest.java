package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

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
    void registerStoresHashedPasswordAndReturnsTokens() throws Exception {
        String email = "register-user@example.com";
        String password = "password123";
        String body = objectMapper.writeValueAsString(new RegisterPayload(email, password, "테스터"));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());

        UserEntity user = userRepository.findByEmail(email).orElseThrow();
        assertThat(user.getPasswordHash()).isNotEqualTo(password);
        assertThat(passwordEncoder.matches(password, user.getPasswordHash())).isTrue();
        assertThat(authIdentityRepository.existsByProviderAndProviderUserId("LOCAL", email)).isTrue();
    }

    @Test
    void loginReturnsTokensWhenCredentialsAreValid() throws Exception {
        String email = "login-user@example.com";
        String password = "password123";

        UserEntity saved = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "로그인유저",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(saved, "LOCAL", email));

        String body = objectMapper.writeValueAsString(new LoginPayload(email, password));
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    void loginReturnsUnauthorizedWhenCredentialsAreInvalid() throws Exception {
        String email = "invalid-login@example.com";
        userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode("password123"),
                "실패유저",
                "ACTIVE"
        ));

        String body = objectMapper.writeValueAsString(new LoginPayload(email, "wrongpassword"));
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void refreshReturnsNewTokensWhenRefreshTokenIsValid() throws Exception {
        String email = "refresh-user@example.com";
        String password = "password123";
        UserEntity saved = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "리프레시유저",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(saved, "LOCAL", email));

        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode loginJson = objectMapper.readTree(loginResponse);
        String refreshToken = loginJson.get("refreshToken").asText();

        String refreshBody = objectMapper.writeValueAsString(new RefreshPayload(refreshToken));
        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    void refreshReturnsUnauthorizedWhenTokenTypeIsNotRefresh() throws Exception {
        String email = "refresh-invalid-user@example.com";
        String password = "password123";
        UserEntity saved = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "리프레시실패유저",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(saved, "LOCAL", email));

        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode loginJson = objectMapper.readTree(loginResponse);
        String accessToken = loginJson.get("accessToken").asText();

        String refreshBody = objectMapper.writeValueAsString(new RefreshPayload(accessToken));
        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void meReturnsProfileWithRolesWhenAuthenticated() throws Exception {
        String email = "me-user@example.com";
        String password = "password123";
        UserEntity saved = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "내정보유저",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(saved, "LOCAL", email));

        jdbcTemplate.update("INSERT INTO roles (code, description) VALUES (?, ?)", "USER", "일반 사용자");
        jdbcTemplate.update("INSERT INTO roles (code, description) VALUES (?, ?)", "DRIVER", "기사");
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code IN (?, ?)
                """,
                saved.getId(), "USER", "DRIVER"
        );

        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String accessToken = objectMapper.readTree(loginResponse).get("accessToken").asText();

        mockMvc.perform(get("/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.displayName").value("내정보유저"))
                .andExpect(jsonPath("$.roles[0]").value("DRIVER"))
                .andExpect(jsonPath("$.roles[1]").value("USER"));
    }

    @Test
    void meReturnsUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void registerReturnsConflictWhenEmailAlreadyExists() throws Exception {
        String email = "duplicate@example.com";
        userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode("password123"),
                "중복유저",
                "ACTIVE"
        ));

        String body = objectMapper.writeValueAsString(new RegisterPayload(email, "password123", "중복유저"));
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));
    }

    private record RegisterPayload(String email, String password, String displayName) {
    }

    private record LoginPayload(String email, String password) {
    }

    private record RefreshPayload(String refreshToken) {
    }
}
