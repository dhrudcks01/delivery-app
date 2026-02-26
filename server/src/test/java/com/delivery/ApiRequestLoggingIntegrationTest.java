package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
class ApiRequestLoggingIntegrationTest {

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
        jdbcTemplate.update("MERGE INTO roles (code, description) KEY(code) VALUES (?, ?)", "USER", "일반 사용자");
    }

    @Test
    void loggingFilterPropagatesRequestIdAndWritesCommonLog(CapturedOutput output) throws Exception {
        String requestId = "request-id-test-001";

        mockMvc.perform(get("/health")
                        .header("X-Request-Id", requestId))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-Id", requestId));

        String logs = output.getOut();
        assertThat(logs).contains("requestId=" + requestId);
        assertThat(logs).contains("method=GET");
        assertThat(logs).contains("uri=/health");
        assertThat(logs).contains("status=200");
        assertThat(logs).contains("durationMs=");
        assertThat(logs).contains("clientIp=");
    }

    @Test
    void loggingFilterIncludesAuthenticatedUserAndExcludesSensitiveValues(CapturedOutput output) throws Exception {
        String email = "log-test-user@example.com";
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "로그테스터",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                user.getId(),
                "USER"
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
                .andExpect(status().isOk());

        List<String> requestLogs = output.getOut().lines()
                .filter(line -> line.contains("ApiRequestLoggingFilter"))
                .toList();

        assertThat(requestLogs).isNotEmpty();

        String joinedRequestLogs = String.join("\n", requestLogs);
        assertThat(joinedRequestLogs).contains("userEmail=" + email);
        assertThat(joinedRequestLogs).contains("userId=" + user.getId());
        assertThat(joinedRequestLogs).doesNotContain(password);
        assertThat(joinedRequestLogs).doesNotContain(accessToken);
    }

    private record LoginPayload(String email, String password) {
    }
}
