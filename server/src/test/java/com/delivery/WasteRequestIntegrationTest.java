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
        upsertRole("USER", "일반 사용자");
        upsertRole("DRIVER", "기사");
    }

    @Test
    void userCanCreateListDetailAndCancelOwnWasteRequest() throws Exception {
        String accessToken = createUserAndLogin("waste-user@example.com");
        String createBody = """
                {
                  "address": "서울시 중구 세종대로 1",
                  "contactPhone": "010-1234-0000",
                  "note": "경비실에 맡겨주세요.",
                  "disposalItems": ["일반쓰레기", "재활용"],
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
                .andExpect(jsonPath("$[0].disposalItems[0]").value("일반쓰레기"))
                .andExpect(jsonPath("$[0].disposalItems[1]").value("재활용"))
                .andExpect(jsonPath("$[0].bagCount").value(2));

        mockMvc.perform(get("/waste-requests/{requestId}", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId))
                .andExpect(jsonPath("$.orderNo").value(expectedOrderNo))
                .andExpect(jsonPath("$.disposalItems[0]").value("일반쓰레기"))
                .andExpect(jsonPath("$.disposalItems[1]").value("재활용"))
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
        String address = "서초구 " + "가".repeat(251);
        String createBody = """
                {
                  "address": "%s",
                  "contactPhone": "010-2222-3333",
                  "note": "대표 주소지 자동 적용"
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
        String createBody = """
                {
                  "address": "%s",
                  "contactPhone": "010-2222-4444",
                  "note": "대표 주소지 길이 초과"
                }
                """.formatted("가".repeat(256));

        mockMvc.perform(post("/waste-requests")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("address"));
    }

    private Long createWasteRequest(String accessToken) throws Exception {
        String body = """
                {
                  "address": "서울시 강동구 올림픽로 123",
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
                "수거요청테스터",
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

    private String expectedOrderNo(Long requestId) {
        if (requestId < 1_000_000L) {
            return "WR-%06d".formatted(requestId);
        }
        return "WR-" + requestId;
    }

    private record LoginPayload(String email, String password) {
    }
}
