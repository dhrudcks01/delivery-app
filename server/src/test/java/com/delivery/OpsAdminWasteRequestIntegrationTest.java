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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpsAdminWasteRequestIntegrationTest {

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
        upsertRole("USER", "일반 사용자");
        upsertRole("OPS_ADMIN", "운영 관리자");
        upsertRole("DRIVER", "기사");
    }

    @Test
    void opsAdminCanGetWasteRequestListWithStatusFilterAndPaging() throws Exception {
        UserEntity requester = createUser("ops-waste-requester@example.com", "USER");
        createWasteRequest(requester, "REQUESTED", "서울시 강남구 1");
        createWasteRequest(requester, "ASSIGNED", "서울시 강남구 2");

        String opsToken = login("ops-waste-admin@example.com", "OPS_ADMIN");

        mockMvc.perform(get("/ops-admin/waste-requests")
                        .header("Authorization", "Bearer " + opsToken)
                        .param("status", "REQUESTED")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sort", "createdAt,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("REQUESTED"));
    }

    @Test
    void opsAdminCanGetWasteRequestDetail() throws Exception {
        UserEntity requester = createUser("ops-waste-detail-requester@example.com", "USER");
        UserEntity driver = createUser("ops-waste-detail-driver@example.com", "DRIVER");
        WasteRequestEntity request = createWasteRequest(requester, "REQUESTED", "서울시 중구 10");
        wasteAssignmentRepository.save(new WasteAssignmentEntity(request, driver));
        jdbcTemplate.update(
                "INSERT INTO waste_photos (request_id, url, type, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                request.getId(),
                "/uploads/files/ops-detail-photo.jpg",
                "TRASH"
        );
        jdbcTemplate.update(
                "INSERT INTO waste_status_logs (request_id, from_status, to_status, actor_user_id, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
                request.getId(),
                "REQUESTED",
                "ASSIGNED",
                driver.getId()
        );

        String opsToken = login("ops-waste-detail-admin@example.com", "OPS_ADMIN");

        mockMvc.perform(get("/ops-admin/waste-requests/{requestId}", request.getId())
                        .header("Authorization", "Bearer " + opsToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(request.getId()))
                .andExpect(jsonPath("$.address").value("서울시 중구 10"))
                .andExpect(jsonPath("$.photos.length()").value(1))
                .andExpect(jsonPath("$.statusTimeline.length()").value(1))
                .andExpect(jsonPath("$.driverId").value(driver.getId()))
                .andExpect(jsonPath("$.assignedAt").isNotEmpty());
    }

    @Test
    void userCannotAccessOpsAdminWasteRequestEndpoints() throws Exception {
        String userToken = login("ops-waste-normal-user@example.com", "USER");

        mockMvc.perform(get("/ops-admin/waste-requests")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void opsAdminCanAssignDriverAndTransitionStatusToAssigned() throws Exception {
        UserEntity requester = createUser("assign-requester@example.com", "USER");
        UserEntity driver = createUser("assign-driver@example.com", "DRIVER");
        WasteRequestEntity request = createWasteRequest(requester, "REQUESTED", "서울시 강서구 1");
        String opsToken = login("assign-ops-admin@example.com", "OPS_ADMIN");

        String body = objectMapper.writeValueAsString(new AssignPayload(driver.getId()));
        mockMvc.perform(post("/ops-admin/waste-requests/{requestId}/assign", request.getId())
                        .header("Authorization", "Bearer " + opsToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ASSIGNED"));

        WasteRequestEntity updated = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("ASSIGNED");
        assertThat(wasteAssignmentRepository.existsByRequestId(request.getId())).isTrue();
    }

    @Test
    void assignReturnsBadRequestWhenTargetUserIsNotDriver() throws Exception {
        UserEntity requester = createUser("assign-invalid-requester@example.com", "USER");
        UserEntity nonDriver = createUser("assign-non-driver@example.com", "USER");
        WasteRequestEntity request = createWasteRequest(requester, "REQUESTED", "서울시 영등포구 2");
        String opsToken = login("assign-invalid-ops-admin@example.com", "OPS_ADMIN");

        String body = objectMapper.writeValueAsString(new AssignPayload(nonDriver.getId()));
        mockMvc.perform(post("/ops-admin/waste-requests/{requestId}/assign", request.getId())
                        .header("Authorization", "Bearer " + opsToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DRIVER_ROLE_REQUIRED"));
    }

    @Test
    void opsAdminCanSearchDriverCandidatesByNameAndExcludesInactiveOrNonDriver() throws Exception {
        createUser("driver-search-active@example.com", "DRIVER", "ACTIVE", "김기사");
        createUser("driver-search-inactive@example.com", "DRIVER", "INACTIVE", "김기사");
        createUser("user-search@example.com", "USER", "ACTIVE", "김기사");
        String opsToken = login("search-ops-admin@example.com", "OPS_ADMIN");

        mockMvc.perform(get("/ops-admin/waste-requests/driver-candidates")
                        .header("Authorization", "Bearer " + opsToken)
                        .param("query", "김기사")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].loginId").value("driver-search-active@example.com"))
                .andExpect(jsonPath("$.content[0].name").value("김기사"));

        mockMvc.perform(get("/ops-admin/waste-requests/driver-candidates")
                        .header("Authorization", "Bearer " + opsToken)
                        .param("query", "search-active")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].loginId").value("driver-search-active@example.com"));
    }

    @Test
    void assignReturnsBadRequestWhenTargetDriverIsInactive() throws Exception {
        UserEntity requester = createUser("assign-inactive-requester@example.com", "USER");
        UserEntity inactiveDriver = createUser(
                "assign-inactive-driver@example.com",
                "DRIVER",
                "INACTIVE",
                "비활성기사"
        );
        WasteRequestEntity request = createWasteRequest(requester, "REQUESTED", "서울시 성동구 9");
        String opsToken = login("assign-inactive-ops-admin@example.com", "OPS_ADMIN");

        String body = objectMapper.writeValueAsString(new AssignPayload(inactiveDriver.getId()));
        mockMvc.perform(post("/ops-admin/waste-requests/{requestId}/assign", request.getId())
                        .header("Authorization", "Bearer " + opsToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DRIVER_ROLE_REQUIRED"));
    }

    private UserEntity createUser(String email, String roleCode) {
        return createUser(email, roleCode, "ACTIVE", "수거요청조회테스터");
    }

    private UserEntity createUser(String email, String roleCode, String status, String displayName) {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                email,
                passwordEncoder.encode("password123"),
                displayName,
                status
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

    private WasteRequestEntity createWasteRequest(UserEntity requester, String status, String address) {
        WasteRequestEntity request = wasteRequestRepository.save(new WasteRequestEntity(
                requester,
                address,
                "010-1111-2222",
                null,
                "REQUESTED",
                "KRW"
        ));
        request.changeStatus(status);
        return wasteRequestRepository.save(request);
    }

    private String login(String email, String roleCode) throws Exception {
        createUser(email, roleCode);
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

    private record LoginPayload(String email, String password) {
    }

    private record AssignPayload(Long driverId) {
    }
}
