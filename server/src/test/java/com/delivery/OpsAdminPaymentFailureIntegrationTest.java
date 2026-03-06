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
    void opsAdminCanExecutePendingBatchWithPartialFailure() throws Exception {
        UserEntity requesterSuccess = createUser("ops-payment-user-success@example.com", "USER");
        UserEntity requesterFailure = createUser("ops-payment-user-failure@example.com", "USER");
        UserEntity driver = createUser("ops-payment-driver@example.com", "DRIVER");
        UserEntity opsAdmin = createUser("ops-payment-admin@example.com", "OPS_ADMIN");

        WasteRequestEntity successRequest = createAssignedRequest(requesterSuccess, driver);
        WasteRequestEntity failedRequest = createAssignedRequest(requesterFailure, driver);

        String driverToken = login(driver.getEmail());
        String opsToken = login(opsAdmin.getEmail());

        measure(driverToken, successRequest.getId(), "4.500", "/uploads/files/pending-1.jpg");
        measure(driverToken, failedRequest.getId(), "5.000", "/uploads/files/pending-2.jpg");

        mockMvc.perform(get("/ops-admin/payments/pending")
                        .header("Authorization", "Bearer " + opsToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.content[*].wasteRequestId").value(hasItem(successRequest.getId().intValue())))
                .andExpect(jsonPath("$.content[*].wasteRequestId").value(hasItem(failedRequest.getId().intValue())));

        createActivePaymentMethod(requesterSuccess);

        String batchBody = objectMapper.writeValueAsString(new PendingBatchPayload(
                List.of(successRequest.getId(), failedRequest.getId())
        ));

        mockMvc.perform(post("/ops-admin/payments/pending/batch-execute")
                        .header("Authorization", "Bearer " + opsToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(batchBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestedCount").value(2))
                .andExpect(jsonPath("$.succeededCount").value(1))
                .andExpect(jsonPath("$.failedCount").value(1))
                .andExpect(jsonPath("$.skippedCount").value(0));

        assertThat(readRequestStatus(successRequest.getId())).isEqualTo("COMPLETED");
        assertThat(readPaymentStatus(successRequest.getId())).isEqualTo("SUCCEEDED");

        assertThat(readRequestStatus(failedRequest.getId())).isEqualTo("PAYMENT_FAILED");
        assertThat(readPaymentStatus(failedRequest.getId())).isEqualTo("FAILED");
    }

    @Test
    void opsAdminCanListFailedPaymentsAndRetry() throws Exception {
        UserEntity requester = createUser("ops-payment-retry-user@example.com", "USER");
        UserEntity driver = createUser("ops-payment-retry-driver@example.com", "DRIVER");
        UserEntity opsAdmin = createUser("ops-payment-retry-admin@example.com", "OPS_ADMIN");

        WasteRequestEntity request = createAssignedRequest(requester, driver);
        String driverToken = login(driver.getEmail());
        String opsToken = login(opsAdmin.getEmail());

        measure(driverToken, request.getId(), "3.250", "/uploads/files/retry-pending.jpg");

        String batchBody = objectMapper.writeValueAsString(new PendingBatchPayload(List.of(request.getId())));
        mockMvc.perform(post("/ops-admin/payments/pending/batch-execute")
                        .header("Authorization", "Bearer " + opsToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(batchBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestedCount").value(1))
                .andExpect(jsonPath("$.failedCount").value(1));

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

        assertThat(readRequestStatus(request.getId())).isEqualTo("COMPLETED");
        assertThat(readPaymentStatus(request.getId())).isEqualTo("SUCCEEDED");
    }

    private void measure(String driverToken, Long requestId, String measuredWeightKg, String photoUrl) throws Exception {
        String measureBody = objectMapper.writeValueAsString(new MeasurePayload(
                new BigDecimal(measuredWeightKg),
                List.of(photoUrl)
        ));

        mockMvc.perform(post("/driver/waste-requests/{requestId}/measure", requestId)
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(measureBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAYMENT_PENDING"));
    }

    private String readRequestStatus(Long requestId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM waste_requests WHERE id = ?",
                String.class,
                requestId
        );
    }

    private String readPaymentStatus(Long requestId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM payments WHERE waste_request_id = ?",
                String.class,
                requestId
        );
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

    private record PendingBatchPayload(List<Long> wasteRequestIds) {
    }
}
