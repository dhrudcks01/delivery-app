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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WasteRequestIntegrationTest {

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
        upsertRole("DRIVER", "Driver");

        jdbcTemplate.update("DELETE FROM service_areas");
        registerServiceArea("Seoul", "Mapo-gu", "Seogyo-dong");
        registerServiceArea("Seoul", "Gangdong-gu", "Cheonho-dong");
        registerServiceArea("Seoul", "Seocho-gu", "Bangbae-dong");
    }

    @Test
    void userCanCreateListDetailAndCancelOwnWasteRequest() throws Exception {
        String accessToken = createUserAndLogin("waste-user@example.com");
        String createBody = """
                {
                  "address": "Seoul Mapo-gu Seogyo-dong Worldcup-ro 1",
                  "contactPhone": "010-1234-0000",
                  "note": "Leave at the security office",
                  "disposalItems": ["GENERAL", "RECYCLE"],
                  "bagCount": 2
                }
                """;

        String createResponse = mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.currency").value("KRW"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long requestId = objectMapper.readTree(createResponse).get("id").asLong();
        String expectedOrderNo = expectedOrderNo(requestId);

        mockMvc.perform(get("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(requestId))
                .andExpect(jsonPath("$[0].orderNo").value(expectedOrderNo))
                .andExpect(jsonPath("$[0].disposalItems[0]").value("GENERAL"))
                .andExpect(jsonPath("$[0].disposalItems[1]").value("RECYCLE"))
                .andExpect(jsonPath("$[0].bagCount").value(2));

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId))
                .andExpect(jsonPath("$.orderNo").value(expectedOrderNo))
                .andExpect(jsonPath("$.disposalItems[0]").value("GENERAL"))
                .andExpect(jsonPath("$.disposalItems[1]").value("RECYCLE"))
                .andExpect(jsonPath("$.bagCount").value(2));

        mockMvc.perform(post("/waste-requests/{requestId}/cancel", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"));
    }

    @Test
    void userCannotCancelWhenStatusIsNotRequested() throws Exception {
        String accessToken = createUserAndLogin("waste-cancel-conflict@example.com");
        Long requestId = createWasteRequest(accessToken);

        jdbcTemplate.update("UPDATE waste_requests SET status = 'ASSIGNED' WHERE id = ?", requestId);

        mockMvc.perform(post("/waste-requests/{requestId}/cancel", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("WASTE_STATUS_TRANSITION_CONFLICT"));
    }

    @Test
    void userCannotAccessOtherUsersWasteRequest() throws Exception {
        String ownerAccessToken = createUserAndLogin("waste-owner@example.com");
        String otherAccessToken = createUserAndLogin("waste-other@example.com");
        Long requestId = createWasteRequest(ownerAccessToken);

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + otherAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("WASTE_REQUEST_ACCESS_DENIED"));
    }

    @Test
    void myDetailIncludesPhotosWeightAmountAndStatusTimeline() throws Exception {
        String accessToken = createUserAndLogin("waste-detail-owner@example.com");
        UserEntity driver = createUser("waste-detail-driver@example.com", "DRIVER");
        Long requestId = createWasteRequest(accessToken);

        jdbcTemplate.update(
                "UPDATE waste_requests SET status = 'MEASURED', measured_weight_kg = ?, measured_at = CURRENT_TIMESTAMP, measured_by_driver_id = ?, final_amount = ? WHERE id = ?",
                "4.250",
                driver.getId(),
                4250L,
                requestId
        );
        jdbcTemplate.update(
                "INSERT INTO waste_photos (request_id, url, type, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                requestId,
                "/uploads/files/detail-photo-1.jpg",
                "TRASH"
        );
        jdbcTemplate.update(
                "INSERT INTO waste_photos (request_id, url, type, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                requestId,
                "/uploads/files/detail-photo-2.jpg",
                "SCALE"
        );
        jdbcTemplate.update(
                "INSERT INTO waste_status_logs (request_id, from_status, to_status, actor_user_id, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
                requestId,
                "REQUESTED",
                "ASSIGNED",
                driver.getId()
        );
        jdbcTemplate.update(
                "INSERT INTO waste_status_logs (request_id, from_status, to_status, actor_user_id, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
                requestId,
                "ASSIGNED",
                "MEASURED",
                driver.getId()
        );

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MEASURED"))
                .andExpect(jsonPath("$.photos.length()").value(2))
                .andExpect(jsonPath("$.photos[0].url").value("/uploads/files/detail-photo-1.jpg"))
                .andExpect(jsonPath("$.measuredWeightKg").value(4.25))
                .andExpect(jsonPath("$.finalAmount").value(4250))
                .andExpect(jsonPath("$.statusTimeline.length()").value(2))
                .andExpect(jsonPath("$.statusTimeline[0].toStatus").value("ASSIGNED"))
                .andExpect(jsonPath("$.statusTimeline[1].toStatus").value("MEASURED"));
    }

    @Test
    void disposalItemsAndBagCountAreOptionalForBackwardCompatibility() throws Exception {
        String accessToken = createUserAndLogin("waste-backward-compatible@example.com");
        Long requestId = createWasteRequest(accessToken);

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disposalItems.length()").value(0))
                .andExpect(jsonPath("$.bagCount").value(0));
    }

    @Test
    void orderNoIsGeneratedWithPolicyAndIsUniqueAcrossRequests() throws Exception {
        String accessToken = createUserAndLogin("waste-order-no@example.com");
        Long firstId = createWasteRequest(accessToken);
        Long secondId = createWasteRequest(accessToken);

        mockMvc.perform(get("/waste-requests/{requestId}", firstId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNo").value(expectedOrderNo(firstId)));

        mockMvc.perform(get("/waste-requests/{requestId}", secondId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNo").value(expectedOrderNo(secondId)));
    }

    @Test
    void userCanCreateWasteRequestWhenAddressLengthIs255() throws Exception {
        String accessToken = createUserAndLogin("waste-address-255@example.com");
        String prefix = "Seoul Seocho-gu Bangbae-dong ";
        String address = prefix + "a".repeat(255 - prefix.length());
        String createBody = """
                {
                  "address": "%s",
                  "contactPhone": "010-2222-3333",
                  "note": "max length"
                }
                """.formatted(address);

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.address").value(address));
    }

    @Test
    void userCannotCreateWasteRequestWhenAddressLengthExceeds255() throws Exception {
        String accessToken = createUserAndLogin("waste-address-256@example.com");
        String prefix = "Seoul Seocho-gu Bangbae-dong ";
        String longAddress = prefix + "a".repeat(256 - prefix.length());
        String createBody = """
                {
                  "address": "%s",
                  "contactPhone": "010-2222-4444",
                  "note": "too long"
                }
                """.formatted(longAddress);

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("address"));
    }

    @Test
    void userCannotCreateWasteRequestWhenAddressNotInServiceAreaWhitelist() throws Exception {
        String accessToken = createUserAndLogin("waste-service-area-deny@example.com");
        String createBody = """
                {
                  "address": "Seoul Jongno-gu Gahoe-dong 10",
                  "contactPhone": "010-2222-5555",
                  "note": null
                }
                """;

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SERVICE_AREA_UNAVAILABLE"));
    }

    @Test
    void userCannotCreateWasteRequestWhenDongCannotBeResolved() throws Exception {
        String accessToken = createUserAndLogin("waste-service-area-parse-fail@example.com");
        String createBody = """
                {
                  "address": "Seoul Mapo-gu Worldcup-ro 12",
                  "contactPhone": "010-2222-6666",
                  "note": null
                }
                """;

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SERVICE_AREA_UNAVAILABLE"));
    }

    private Long createWasteRequest(String accessToken) throws Exception {
        String body = """
                {
                  "address": "Seoul Gangdong-gu Cheonho-dong Olympic-ro 123",
                  "contactPhone": "010-7777-8888",
                  "note": null
                }
                """;
        String response = mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private String createUserAndLogin(String email) throws Exception {
        createUser(email, "USER");
        String password = "password123";

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

    private UserEntity createUser(String email, String roleCode) {
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "Waste Request Tester",
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

    private void upsertRole(String code, String description) {
        jdbcTemplate.update("MERGE INTO roles (code, description) KEY(code) VALUES (?, ?)", code, description);
    }

    private void registerServiceArea(String city, String district, String dong) {
        jdbcTemplate.update(
                """
                INSERT INTO service_areas (city, district, dong, is_active)
                VALUES (?, ?, ?, true)
                """,
                city,
                district,
                dong
        );
    }

    private String expectedOrderNo(Long requestId) {
        if (requestId < 1_000_000L) {
            return "WR-%06d".formatted(requestId);
        }
        return "WR-" + requestId;
    }

    private record LoginPayload(String email, String password) {
    }
}
