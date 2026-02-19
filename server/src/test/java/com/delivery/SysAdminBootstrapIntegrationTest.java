package com.delivery;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.bootstrap.sys-admin.email=bootstrap-admin@example.com",
        "app.bootstrap.sys-admin.password=bootstrap-password-123",
        "app.bootstrap.sys-admin.display-name=초기시스템관리자"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SysAdminBootstrapIntegrationTest {

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
    void bootstrapCreatesSysAdminUserAndRoleBinding() {
        UserEntity user = userRepository.findByEmail("bootstrap-admin@example.com").orElseThrow();
        assertThat(passwordEncoder.matches("bootstrap-password-123", user.getPasswordHash())).isTrue();
        assertThat(user.getDisplayName()).isEqualTo("초기시스템관리자");
        assertThat(authIdentityRepository.existsByProviderAndProviderUserId("LOCAL", "bootstrap-admin@example.com"))
                .isTrue();

        Integer roleCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = ? AND r.code = 'SYS_ADMIN'
                """,
                Integer.class,
                user.getId()
        );
        assertThat(roleCount).isEqualTo(1);

        Integer metadataCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bootstrap_metadata WHERE metadata_key = 'sys_admin_bootstrap_v1'",
                Integer.class
        );
        assertThat(metadataCount).isEqualTo(1);
    }

    @Test
    void bootstrapSysAdminCanLogin() throws Exception {
        String body = objectMapper.writeValueAsString(
                new LoginPayload("bootstrap-admin@example.com", "bootstrap-password-123")
        );

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    private record LoginPayload(String email, String password) {
    }
}
