package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.waste.entity.WasteAssignmentEntity;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.repository.WasteAssignmentRepository;
import com.delivery.waste.repository.WasteRequestRepository;
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

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpsAdminPaymentFailureIntegrationTest {

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

    @Autowired
    private WasteRequestRepository wasteRequestRepository;

    @Autowired
    private WasteAssignmentRepository wasteAssignmentRepository;

    @BeforeEach
    void setUpRoles() {
        upsertRole("USER", "General User");
        upsertRole("DRIVER", "Driver");
        upsertRole("OPS_ADMIN", "Ops Admin");
    }

    @Test
    void opsAdminCanListFailedPaymentsAndRetry() throws Exception {
        UserEntity requester = createUser("ops-payment-user@example.com", "USER");
        UserEntity driver = createUser("ops-payment-driver@example.com", "DRIVER");
        UserEntity opsAdmin = createUser("ops-payment-admin@example.com", "OPS_ADMIN");

        WasteRequestEntity request = createAssignedRequest(requester, driver);
        String driverToken = login(driver.getEmail());
        String opsToken = login(opsAdmin.getEmail());

        String measureBody = objectMapper.writeValueAsString(new MeasurePayload(
                new BigDecimal("4.500"),
                List.of("/uploads/files/fail-1.jpg")
        ));

        mockMvc.perform(post("/driver/waste-requests/{requestId}/measure", request.getId())
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(measureBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAYMENT_FAILED"));

        mockMvc.perform(get("/ops-admin/payments/failed")
                        .header("Authorization", "Bearer " + opsToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.content[*].wasteRequestId").value(hasItem(request.getId().intValue())));

        createActivePaymentMethod(requester);

        mockMvc.perform(post("/ops-admin/payments/waste-requests/{wasteRequestId}/retry", request.getId())
                        .header("Authorization", "Bearer " + opsToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        String requestStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM waste_requests WHERE id = ?",
                String.class,
                request.getId()
        );
        assertThat(requestStatus).isEqualTo("COMPLETED");

        String paymentStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM payments WHERE waste_request_id = ?",
                String.class,
                request.getId()
        );
        assertThat(paymentStatus).isEqualTo("SUCCEEDED");
    }

    private WasteRequestEntity createAssignedRequest(UserEntity requester, UserEntity driver) {
        WasteRequestEntity request = wasteRequestRepository.save(new WasteRequestEntity(
                requester,
                "Seoul Payment Retry",
                "010-2000-3000",
                null,
                "REQUESTED",
                "KRW"
        ));
        request.changeStatus("ASSIGNED");
        WasteRequestEntity updated = wasteRequestRepository.save(request);
        wasteAssignmentRepository.save(new WasteAssignmentEntity(updated, driver));
        return updated;
    }

    private UserEntity createUser(String email, String roleCode) {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode("password123"),
                "Ops Payment Test",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        assignRole(user.getId(), roleCode);
        return user;
    }

    private String login(String email) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginPayload(email, "password123"));
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
                SELECT ?, id
                FROM roles
                WHERE code = ?
                """,
                userId,
                roleCode
        );
    }

    private void createActivePaymentMethod(UserEntity user) {
        jdbcTemplate.update(
                """
                INSERT INTO payment_methods (user_id, provider, customer_key, billing_key_or_token, status)
                VALUES (?, 'TOSS', ?, ?, 'ACTIVE')
                """,
                user.getId(),
                "delivery_user_" + user.getId() + "_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "retry-billing-token"
        );
    }

    private record LoginPayload(String email, String password) {
    }

    private record MeasurePayload(BigDecimal measuredWeightKg, List<String> photoUrls) {
    }
}
