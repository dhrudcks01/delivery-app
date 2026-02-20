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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentMethodRegistrationIntegrationTest {

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
    }

    @Test
    void userCanStartAndCompletePaymentMethodRegistration() throws Exception {
        TestUser user = createUserWithUserRole();

        String startResponse = mockMvc.perform(post("/user/payment-methods/registration/start")
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerKey").value(org.hamcrest.Matchers.startsWith("delivery_user_" + user.id() + "_")))
                .andExpect(jsonPath("$.registrationUrl").value(org.hamcrest.Matchers.containsString("customerKey=")))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String customerKey = objectMapper.readTree(startResponse).get("customerKey").asText();

        mockMvc.perform(get("/user/payment-methods/registration/success")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .param("customerKey", customerKey)
                        .param("authKey", "billing-auth-key-123"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.provider").value("TOSS"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payment_methods WHERE user_id = ?",
                Long.class,
                user.id()
        );
        assertThat(count).isEqualTo(1L);
    }

    @Test
    void successCallbackRejectsOtherUsersCustomerKey() throws Exception {
        TestUser userA = createUserWithUserRole();
        TestUser userB = createUserWithUserRole();

        String startResponse = mockMvc.perform(post("/user/payment-methods/registration/start")
                        .header("Authorization", "Bearer " + userB.accessToken()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String customerKeyOfUserB = objectMapper.readTree(startResponse).get("customerKey").asText();

        mockMvc.perform(get("/user/payment-methods/registration/success")
                        .header("Authorization", "Bearer " + userA.accessToken())
                        .param("customerKey", customerKeyOfUserB)
                        .param("authKey", "billing-auth-key-xyz"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PAYMENT_METHOD_REGISTRATION"));
    }

    private TestUser createUserWithUserRole() throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String email = "payment-user-" + unique + "@example.com";
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "결제 테스트 사용자",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        assignRole(user.getId(), "USER");
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
