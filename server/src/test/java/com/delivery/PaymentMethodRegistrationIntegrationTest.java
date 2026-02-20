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
        upsertRole("USER", "General User");
    }

    @Test
    void userCanRegisterAndQueryPaymentMethodStatus() throws Exception {
        TestUser user = createUserWithUserRole();
        String customerKey = startRegistration(user.accessToken(), user.id());

        mockMvc.perform(get("/user/payment-methods/registration/success")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .param("customerKey", customerKey)
                        .param("authKey", "billing-auth-key-123"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.provider").value("TOSS"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/user/payment-methods")
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canReregister").value(true))
                .andExpect(jsonPath("$.paymentMethods.length()").value(1))
                .andExpect(jsonPath("$.paymentMethods[0].status").value("ACTIVE"));

        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payment_methods WHERE user_id = ?",
                Long.class,
                user.id()
        );
        assertThat(count).isEqualTo(1L);
    }

    @Test
    void reRegisterDeactivatesPreviousActiveMethod() throws Exception {
        TestUser user = createUserWithUserRole();

        String firstCustomerKey = startRegistration(user.accessToken(), user.id());
        mockMvc.perform(get("/user/payment-methods/registration/success")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .param("customerKey", firstCustomerKey)
                        .param("authKey", "billing-auth-key-1"))
                .andExpect(status().isCreated());

        String secondCustomerKey = startRegistration(user.accessToken(), user.id());
        mockMvc.perform(get("/user/payment-methods/registration/success")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .param("customerKey", secondCustomerKey)
                        .param("authKey", "billing-auth-key-2"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/user/payment-methods")
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentMethods.length()").value(2))
                .andExpect(jsonPath("$.paymentMethods[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.paymentMethods[1].status").value("INACTIVE"));
    }

    @Test
    void successCallbackRejectsOtherUsersCustomerKey() throws Exception {
        TestUser userA = createUserWithUserRole();
        TestUser userB = createUserWithUserRole();
        String customerKeyOfUserB = startRegistration(userB.accessToken(), userB.id());

        mockMvc.perform(get("/user/payment-methods/registration/success")
                        .header("Authorization", "Bearer " + userA.accessToken())
                        .param("customerKey", customerKeyOfUserB)
                        .param("authKey", "billing-auth-key-xyz"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PAYMENT_METHOD_REGISTRATION"));
    }

    private String startRegistration(String accessToken, Long userId) throws Exception {
        String startResponse = mockMvc.perform(post("/user/payment-methods/registration/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerKey").value(org.hamcrest.Matchers.startsWith("delivery_user_" + userId + "_")))
                .andExpect(jsonPath("$.registrationUrl").value(org.hamcrest.Matchers.containsString("customerKey=")))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(startResponse).get("customerKey").asText();
    }

    private TestUser createUserWithUserRole() throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String email = "payment-user-" + unique + "@example.com";
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "Payment Test User",
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
