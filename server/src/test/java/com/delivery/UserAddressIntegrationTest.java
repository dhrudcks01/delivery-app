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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserAddressIntegrationTest {

    private static final String DEFAULT_PASSWORD = "password123";

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
        jdbcTemplate.update("DELETE FROM user_addresses");
    }

    @Test
    void userCanManageAddressesAndKeepSinglePrimary() throws Exception {
        TestUser user = createUserAndLogin("user-address-1@example.com");

        String firstResponse = mockMvc.perform(post("/user/addresses")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roadAddress": "서울특별시 관악구 인헌1길 66",
                                  "jibunAddress": "서울특별시 관악구 봉천동 1-1",
                                  "zipCode": "08790",
                                  "detailAddress": "101호",
                                  "isPrimary": false
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isPrimary").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long firstAddressId = objectMapper.readTree(firstResponse).get("id").asLong();

        String secondResponse = mockMvc.perform(post("/user/addresses")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roadAddress": "서울특별시 관악구 낙성대로 4",
                                  "jibunAddress": "서울특별시 관악구 봉천동 2-2",
                                  "zipCode": "08801",
                                  "detailAddress": "202호",
                                  "isPrimary": false
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isPrimary").value(false))
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long secondAddressId = objectMapper.readTree(secondResponse).get("id").asLong();

        mockMvc.perform(patch("/user/addresses/{addressId}/primary", secondAddressId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(secondAddressId))
                .andExpect(jsonPath("$.isPrimary").value(true));

        mockMvc.perform(get("/user/addresses")
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(secondAddressId))
                .andExpect(jsonPath("$[0].isPrimary").value(true))
                .andExpect(jsonPath("$[1].id").value(firstAddressId))
                .andExpect(jsonPath("$[1].isPrimary").value(false));

        mockMvc.perform(delete("/user/addresses/{addressId}", secondAddressId)
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/user/addresses")
                        .header("Authorization", "Bearer " + user.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(firstAddressId))
                .andExpect(jsonPath("$[0].isPrimary").value(true));
    }

    @Test
    void userCannotModifyAnotherUsersAddress() throws Exception {
        TestUser owner = createUserAndLogin("user-address-owner@example.com");
        TestUser other = createUserAndLogin("user-address-other@example.com");

        String ownerAddressResponse = mockMvc.perform(post("/user/addresses")
                        .header("Authorization", "Bearer " + owner.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roadAddress": "서울특별시 관악구 인헌1길 66",
                                  "isPrimary": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long ownerAddressId = objectMapper.readTree(ownerAddressResponse).get("id").asLong();

        mockMvc.perform(patch("/user/addresses/{addressId}/primary", ownerAddressId)
                        .header("Authorization", "Bearer " + other.accessToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_ADDRESS_NOT_FOUND"));

        mockMvc.perform(delete("/user/addresses/{addressId}", ownerAddressId)
                        .header("Authorization", "Bearer " + other.accessToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_ADDRESS_NOT_FOUND"));
    }

    @Test
    void sameUserCanLoadAddressesAfterRelogin() throws Exception {
        String loginId = "user-address-sync@example.com";
        TestUser firstSession = createUserAndLogin(loginId);

        mockMvc.perform(post("/user/addresses")
                        .header("Authorization", "Bearer " + firstSession.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roadAddress": "서울특별시 관악구 인헌1길 66",
                                  "jibunAddress": "서울특별시 관악구 봉천동 1-1",
                                  "zipCode": "08790",
                                  "detailAddress": "303호",
                                  "isPrimary": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isPrimary").value(true));

        TestUser secondSession = loginExistingUser(loginId);
        mockMvc.perform(get("/user/addresses")
                        .header("Authorization", "Bearer " + secondSession.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].roadAddress").value("서울특별시 관악구 인헌1길 66"))
                .andExpect(jsonPath("$[0].isPrimary").value(true));
    }

    private TestUser createUserAndLogin(String loginId) throws Exception {
        UserEntity user = userRepository.save(new UserEntity(
                loginId,
                passwordEncoder.encode(DEFAULT_PASSWORD),
                "User Address Tester",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", loginId));
        assignRole(user.getId(), "USER");
        user.markPhoneVerified(
                "+8210" + String.format("%08d", user.getId() % 100000000L),
                Instant.now(),
                "PORTONE_DANAL",
                "iv-" + user.getId() + "-" + UUID.randomUUID(),
                null,
                null
        );
        userRepository.save(user);

        return loginExistingUser(loginId);
    }

    private TestUser loginExistingUser(String loginId) throws Exception {
        String loginBody = objectMapper.writeValueAsString(new LoginPayload(loginId, DEFAULT_PASSWORD));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return new TestUser(objectMapper.readTree(loginResponse).get("accessToken").asText());
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

    private record LoginPayload(String id, String password) {
    }

    private record TestUser(String accessToken) {
    }
}
