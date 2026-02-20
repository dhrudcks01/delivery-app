package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.waste.entity.WasteAssignmentEntity;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.repository.WasteAssignmentRepository;
import com.delivery.waste.repository.WastePhotoRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DriverWasteRequestIntegrationTest {

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

    @Autowired
    private WastePhotoRepository wastePhotoRepository;

    @BeforeEach
    void setUpRoles() {
        upsertRole("USER", "General User");
        upsertRole("DRIVER", "Driver");
        upsertRole("OPS_ADMIN", "Ops Admin");
    }

    @Test
    void driverCanGetOwnAssignedListAndDetail() throws Exception {
        UserEntity requester = createUser("driver-waste-requester@example.com", "USER");
        UserEntity driver = createUser("driver-waste-driver@example.com", "DRIVER");
        WasteRequestEntity request = createAssignedRequest(requester, driver, "Seoul Mapo 1");
        String driverToken = login("driver-waste-driver@example.com");

        mockMvc.perform(get("/driver/waste-requests")
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestId").value(request.getId()))
                .andExpect(jsonPath("$[0].status").value("ASSIGNED"));

        mockMvc.perform(get("/driver/waste-requests/{requestId}", request.getId())
                        .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestId").value(request.getId()))
                .andExpect(jsonPath("$.address").value("Seoul Mapo 1"));
    }

    @Test
    void driverCannotGetOtherDriversAssignedDetail() throws Exception {
        UserEntity requester = createUser("driver-waste-other-requester@example.com", "USER");
        UserEntity driverA = createUser("driver-waste-driver-a@example.com", "DRIVER");
        UserEntity driverB = createUser("driver-waste-driver-b@example.com", "DRIVER");
        WasteRequestEntity request = createAssignedRequest(requester, driverA, "Seoul Jongro 2");
        String driverBToken = login("driver-waste-driver-b@example.com");

        mockMvc.perform(get("/driver/waste-requests/{requestId}", request.getId())
                        .header("Authorization", "Bearer " + driverBToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("WASTE_REQUEST_NOT_FOUND"));
    }

    @Test
    void nonDriverCannotAccessDriverEndpoints() throws Exception {
        String userToken = login(createUser("driver-waste-normal-user@example.com", "USER").getEmail());

        mockMvc.perform(get("/driver/waste-requests")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void driverMeasureTriggersAutoPaymentAndCompletesOnSuccess() throws Exception {
        UserEntity requester = createUser("driver-measure-requester@example.com", "USER");
        UserEntity driver = createUser("driver-measure-driver@example.com", "DRIVER");
        createActivePaymentMethod(requester);
        WasteRequestEntity request = createAssignedRequest(requester, driver, "Seoul Gangdong 3");
        String driverToken = login(driver.getEmail());
        String body = objectMapper.writeValueAsString(new MeasurePayload(
                new BigDecimal("3.750"),
                List.of("/uploads/files/photo1.jpg", "/uploads/files/photo2.jpg")
        ));

        mockMvc.perform(post("/driver/waste-requests/{requestId}/measure", request.getId())
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.measuredWeightKg").value(3.75))
                .andExpect(jsonPath("$.measuredByDriverId").value(driver.getId()))
                .andExpect(jsonPath("$.finalAmount").value(3750));

        WasteRequestEntity measured = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(measured.getStatus()).isEqualTo("COMPLETED");
        assertThat(measured.getMeasuredWeightKg()).isEqualByComparingTo("3.750");
        assertThat(measured.getMeasuredByDriver().getId()).isEqualTo(driver.getId());
        assertThat(measured.getMeasuredAt()).isNotNull();
        assertThat(measured.getFinalAmount()).isEqualTo(3750L);
        assertThat(wastePhotoRepository.countByRequestId(request.getId())).isEqualTo(2);

        String paymentStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM payments WHERE waste_request_id = ?",
                String.class,
                request.getId()
        );
        assertThat(paymentStatus).isEqualTo("SUCCEEDED");
        Long paymentCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE waste_request_id = ?",
                Long.class,
                request.getId()
        );
        assertThat(paymentCount).isEqualTo(1L);
    }

    @Test
    void driverMeasureMovesToPaymentFailedWhenNoActivePaymentMethod() throws Exception {
        UserEntity requester = createUser("driver-measure-no-payment-requester@example.com", "USER");
        UserEntity driver = createUser("driver-measure-no-payment-driver@example.com", "DRIVER");
        WasteRequestEntity request = createAssignedRequest(requester, driver, "Seoul Gangdong 4");
        String driverToken = login(driver.getEmail());
        String body = objectMapper.writeValueAsString(new MeasurePayload(
                new BigDecimal("2.000"),
                List.of("/uploads/files/photo-a.jpg")
        ));

        mockMvc.perform(post("/driver/waste-requests/{requestId}/measure", request.getId())
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAYMENT_FAILED"))
                .andExpect(jsonPath("$.finalAmount").value(2000));

        String paymentStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM payments WHERE waste_request_id = ?",
                String.class,
                request.getId()
        );
        assertThat(paymentStatus).isEqualTo("FAILED");
    }

    @Test
    void measureReturnsBadRequestWhenPhotoUrlsAreEmpty() throws Exception {
        UserEntity requester = createUser("driver-measure-empty-photo-requester@example.com", "USER");
        UserEntity driver = createUser("driver-measure-empty-photo-driver@example.com", "DRIVER");
        WasteRequestEntity request = createAssignedRequest(requester, driver, "Seoul Gangdong 5");
        String driverToken = login(driver.getEmail());
        String body = objectMapper.writeValueAsString(new MeasurePayload(
                new BigDecimal("1.500"),
                List.of()
        ));

        mockMvc.perform(post("/driver/waste-requests/{requestId}/measure", request.getId())
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    private WasteRequestEntity createAssignedRequest(UserEntity requester, UserEntity driver, String address) {
        WasteRequestEntity request = wasteRequestRepository.save(new WasteRequestEntity(
                requester,
                address,
                "010-1000-2000",
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
                "Driver Waste Test",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                user.getId(),
                roleCode
        );
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

    private void createActivePaymentMethod(UserEntity user) {
        jdbcTemplate.update(
                """
                INSERT INTO payment_methods (user_id, provider, customer_key, billing_key_or_token, status)
                VALUES (?, 'TOSS', ?, ?, 'ACTIVE')
                """,
                user.getId(),
                "delivery_user_" + user.getId() + "_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "test-billing-token"
        );
    }

    private record LoginPayload(String email, String password) {
    }

    private record MeasurePayload(BigDecimal measuredWeightKg, List<String> photoUrls) {
    }
}
