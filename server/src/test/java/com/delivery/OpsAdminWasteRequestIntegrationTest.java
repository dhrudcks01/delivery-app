package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.waste.entity.WasteRequestEntity;
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

    @BeforeEach
    void setUpRoles() {
        upsertRole("USER", "일반 사용자");
        upsertRole("OPS_ADMIN", "운영 관리자");
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
        WasteRequestEntity request = createWasteRequest(requester, "REQUESTED", "서울시 중구 10");
        String opsToken = login("ops-waste-detail-admin@example.com", "OPS_ADMIN");

        mockMvc.perform(get("/ops-admin/waste-requests/{requestId}", request.getId())
                        .header("Authorization", "Bearer " + opsToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(request.getId()))
                .andExpect(jsonPath("$.address").value("서울시 중구 10"));
    }

    @Test
    void userCannotAccessOpsAdminWasteRequestEndpoints() throws Exception {
        String userToken = login("ops-waste-normal-user@example.com", "USER");

        mockMvc.perform(get("/ops-admin/waste-requests")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    private UserEntity createUser(String email, String roleCode) {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode("password123"),
                "수거요청조회테스터",
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
}
