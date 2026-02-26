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

import java.time.Instant;
import java.util.UUID;

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
    void setUp() {
        upsertRole("USER", "General User");
        upsertRole("DRIVER", "Driver");

        jdbcTemplate.update("DELETE FROM service_areas");
        registerServiceArea("Seoul", "Mapo-gu", "Seogyo-dong");
        registerServiceArea("Seoul", "Gangdong-gu", "Cheonho-dong");
        registerServiceArea("Seoul", "Seocho-gu", "Bangbae-dong");
    }

    @Test
    void userCanCreateListDetailAndCancelOwnWasteRequest() throws Exception {
        TestUser user = createUserAndLogin("waste-user@example.com", "USER", true);

        String createBody = """
                {
                  "address": "Seoul Mapo-gu Seogyo-dong Worldcup-ro 1",
                  "note": "Leave at the security office",
                  "disposalItems": ["GENERAL", "RECYCLE"],
                  "bagCount": 2
                }
                """;

        String createResponse = mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.currency").value("KRW"))
                .andExpect(jsonPath("$.contactPhone").value(user.phoneE164()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long requestId = objectMapper.readTree(createResponse).get("id").asLong();
        String expectedOrderNo = expectedOrderNo(requestId);

        mockMvc.perform(get("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(requestId))
                .andExpect(jsonPath("$[0].orderNo").value(expectedOrderNo))
                .andExpect(jsonPath("$[0].contactPhone").value(user.phoneE164()))
                .andExpect(jsonPath("$[0].disposalItems[0]").value("GENERAL"))
                .andExpect(jsonPath("$[0].disposalItems[1]").value("RECYCLE"))
                .andExpect(jsonPath("$[0].bagCount").value(2));

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId))
                .andExpect(jsonPath("$.orderNo").value(expectedOrderNo))
                .andExpect(jsonPath("$.contactPhone").value(user.phoneE164()))
                .andExpect(jsonPath("$.disposalItems[0]").value("GENERAL"))
                .andExpect(jsonPath("$.disposalItems[1]").value("RECYCLE"))
                .andExpect(jsonPath("$.bagCount").value(2));

        mockMvc.perform(post("/waste-requests/{requestId}/cancel", requestId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"));
    }

    @Test
    void userProvidedContactPhoneIsIgnoredAndVerifiedPhoneIsSaved() throws Exception {
        TestUser user = createUserAndLogin("waste-contact-source@example.com", "USER", true);
        String createBody = """
                {
                  "address": "Seoul Mapo-gu Seogyo-dong Worldcup-ro 1",
                  "contactPhone": "010-9999-9999",
                  "note": "ignore input contact"
                }
                """;

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contactPhone").value(user.phoneE164()));
    }

    @Test
    void userCannotCreateWasteRequestWhenPhoneNotVerified() throws Exception {
        TestUser user = createUserAndLogin("waste-phone-unverified@example.com", "USER", false);
        String createBody = """
                {
                  "address": "Seoul Mapo-gu Seogyo-dong Worldcup-ro 1",
                  "note": null
                }
                """;

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PHONE_VERIFICATION_REQUIRED"));
    }

    @Test
    void userCannotCancelWhenStatusIsNotRequested() throws Exception {
        TestUser user = createUserAndLogin("waste-cancel-conflict@example.com", "USER", true);
        Long requestId = createWasteRequest(user.accessToken());

        jdbcTemplate.update("UPDATE waste_requests SET status = 'ASSIGNED' WHERE id = ?", requestId);

        mockMvc.perform(post("/waste-requests/{requestId}/cancel", requestId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("WASTE_STATUS_TRANSITION_CONFLICT"));
    }

    @Test
    void userCannotAccessOtherUsersWasteRequest() throws Exception {
        TestUser owner = createUserAndLogin("waste-owner@example.com", "USER", true);
        TestUser other = createUserAndLogin("waste-other@example.com", "USER", true);
        Long requestId = createWasteRequest(owner.accessToken());

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + other.accessToken()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("WASTE_REQUEST_ACCESS_DENIED"));
    }

    @Test
    void myDetailIncludesPhotosWeightAmountAndStatusTimeline() throws Exception {
        TestUser owner = createUserAndLogin("waste-detail-owner@example.com", "USER", true);
        UserEntity driver = createUser("waste-detail-driver@example.com", "DRIVER", true).user();
        Long requestId = createWasteRequest(owner.accessToken());

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
                        .header("Authorization", "Bearer " + owner.accessToken()))
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
        TestUser user = createUserAndLogin("waste-backward-compatible@example.com", "USER", true);
        Long requestId = createWasteRequest(user.accessToken());

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disposalItems.length()").value(0))
                .andExpect(jsonPath("$.bagCount").value(0));
    }

    @Test
    void orderNoIsGeneratedWithPolicyAndIsUniqueAcrossRequests() throws Exception {
        TestUser user = createUserAndLogin("waste-order-no@example.com", "USER", true);
        Long firstId = createWasteRequest(user.accessToken());
        Long secondId = createWasteRequest(user.accessToken());

        mockMvc.perform(get("/waste-requests/{requestId}", firstId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNo").value(expectedOrderNo(firstId)));

        mockMvc.perform(get("/waste-requests/{requestId}", secondId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNo").value(expectedOrderNo(secondId)));
    }

    @Test
    void userCanCreateWasteRequestWhenAddressLengthIs255() throws Exception {
        TestUser user = createUserAndLogin("waste-address-255@example.com", "USER", true);
        String prefix = "Seoul Seocho-gu Bangbae-dong ";
        String address = prefix + "a".repeat(255 - prefix.length());
        String createBody = """
                {
                  "address": "%s",
                  "note": "max length"
                }
                """.formatted(address);

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.address").value(address));
    }

    @Test
    void userCannotCreateWasteRequestWhenAddressLengthExceeds255() throws Exception {
        TestUser user = createUserAndLogin("waste-address-256@example.com", "USER", true);
        String prefix = "Seoul Seocho-gu Bangbae-dong ";
        String longAddress = prefix + "a".repeat(256 - prefix.length());
        String createBody = """
                {
                  "address": "%s",
                  "note": "too long"
                }
                """.formatted(longAddress);

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("address"));
    }

    @Test
    void userCannotCreateWasteRequestWhenAddressNotInServiceAreaWhitelist() throws Exception {
        TestUser user = createUserAndLogin("waste-service-area-deny@example.com", "USER", true);
        String createBody = """
                {
                  "address": "Seoul Jongno-gu Gahoe-dong 10",
                  "note": null
                }
                """;

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SERVICE_AREA_UNAVAILABLE"));
    }

    @Test
    void userCannotCreateWasteRequestWhenDongCannotBeResolved() throws Exception {
        TestUser user = createUserAndLogin("waste-service-area-parse-fail@example.com", "USER", true);
        String createBody = """
                {
                  "address": "Seoul Mapo-gu Worldcup-ro 12",
                  "note": null
                }
                """;

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SERVICE_AREA_UNAVAILABLE"));
    }

    private Long createWasteRequest(String accessToken) throws Exception {
        String body = """
                {
                  "address": "Seoul Gangdong-gu Cheonho-dong Olympic-ro 123",
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

    private TestUser createUserAndLogin(String email, String roleCode, boolean verifiedPhone) throws Exception {
        UserSetup userSetup = createUser(email, roleCode, verifiedPhone);
        String accessToken = login(email, "password123");
        return new TestUser(userSetup.user().getId(), accessToken, userSetup.phoneE164());
    }

    private UserSetup createUser(String email, String roleCode, boolean verifiedPhone) {
        String password = "password123";
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "Waste Request Tester",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        assignRole(user.getId(), roleCode);

        String phoneE164 = null;
        if (verifiedPhone) {
            phoneE164 = generatePhoneE164(user.getId());
            user.markPhoneVerified(
                    phoneE164,
                    Instant.now(),
                    "PORTONE_DANAL",
                    "iv-" + user.getId() + "-" + UUID.randomUUID(),
                    null,
                    null
            );
            userRepository.save(user);
        }

        return new UserSetup(user, phoneE164);
    }

    private String login(String email, String password) throws Exception {
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

    private String generatePhoneE164(Long userId) {
        long suffix = userId % 100000000L;
        return "+8210" + String.format("%08d", suffix);
    }

    private String expectedOrderNo(Long requestId) {
        if (requestId < 1_000_000L) {
            return "WR-%06d".formatted(requestId);
        }
        return "WR-" + requestId;
    }

    private record LoginPayload(String email, String password) {
    }

    private record TestUser(Long userId, String accessToken, String phoneE164) {
    }

    private record UserSetup(UserEntity user, String phoneE164) {
    }
}

