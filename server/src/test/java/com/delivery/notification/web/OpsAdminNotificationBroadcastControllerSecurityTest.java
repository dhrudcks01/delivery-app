package com.delivery.notification.web;

import com.delivery.auth.repository.UserRepository;
import com.delivery.config.logging.ApiRequestLoggingFilter;
import com.delivery.config.security.JwtAuthenticationFilter;
import com.delivery.config.security.PhoneVerificationGuardFilter;
import com.delivery.notification.service.OpsAdminNotificationBroadcastService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OpsAdminNotificationBroadcastController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import(OpsAdminNotificationBroadcastControllerSecurityTest.TestSecurityConfig.class)
class OpsAdminNotificationBroadcastControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OpsAdminNotificationBroadcastService broadcastService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private PhoneVerificationGuardFilter phoneVerificationGuardFilter;

    @MockBean
    private ApiRequestLoggingFilter apiRequestLoggingFilter;

    @TestConfiguration
    static class TestSecurityConfig {

        @Bean
        SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            http
                    .csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(authorize -> authorize
                            .requestMatchers("/ops-admin/**").hasAnyRole("OPS_ADMIN", "SYS_ADMIN")
                            .anyRequest().authenticated()
                    );
            return http.build();
        }
    }

    @Test
    @WithMockUser(username = "normal-user", roles = {"USER"})
    void userRoleCannotCallBroadcastEndpoint() throws Exception {
        mockMvc.perform(post("/ops-admin/notifications/broadcast")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validBody()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(broadcastService);
    }

    private String validBody() throws Exception {
        return objectMapper.writeValueAsString(new BroadcastBody(
                "서비스 공지",
                "테스트 메시지",
                "ALL_USERS",
                null,
                null,
                "NOTICE"
        ));
    }

    private record BroadcastBody(
            String title,
            String message,
            String targetType,
            List<Long> targetUserIds,
            String scheduledAt,
            String category
    ) {
    }
}
