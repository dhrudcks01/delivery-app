package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.PhoneVerificationException;
import com.delivery.auth.model.PhoneVerificationStatus;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserPhoneVerificationRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.auth.service.PortOneIdentityVerificationClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PhoneVerificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthIdentityRepository authIdentityRepository;

    @Autowired
    private UserPhoneVerificationRepository userPhoneVerificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private PortOneIdentityVerificationClient portOneIdentityVerificationClient;

    @Test
    void startCreatesVerificationRequestAndReturnsPortOneMetadata() throws Exception {
        String email = "phone-start-user@example.com";
        String password = "password123";
        createUserWithUserRole(email, password);
        String accessToken = issueAccessToken(email, password);

        String response = mockMvc.perform(post("/user/phone-verifications/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("PORTONE_DANAL"))
                .andExpect(jsonPath("$.storeId").value("test-store-id"))
                .andExpect(jsonPath("$.channelKey").value("test-channel-key"))
                .andExpect(jsonPath("$.identityVerificationId").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String identityVerificationId = objectMapper.readTree(response).get("identityVerificationId").asText();
        assertThat(userPhoneVerificationRepository.findByIdentityVerificationId(identityVerificationId))
                .isPresent()
                .get()
                .extracting(entity -> entity.getStatus().name())
                .isEqualTo(PhoneVerificationStatus.REQUESTED.name());
    }

    @Test
    void completeStoresVerifiedPhoneInfoAndSupportsIdempotentReplay() throws Exception {
        String email = "phone-complete-user@example.com";
        String password = "password123";
        createUserWithUserRole(email, password);
        String accessToken = issueAccessToken(email, password);

        String startResponse = mockMvc.perform(post("/user/phone-verifications/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String identityVerificationId = objectMapper.readTree(startResponse).get("identityVerificationId").asText();

        Instant verifiedAt = Instant.parse("2026-02-26T00:00:00Z");
        when(portOneIdentityVerificationClient.getIdentityVerification(identityVerificationId))
                .thenReturn(new PortOneIdentityVerificationClient.PortOneIdentityVerificationResult(
                        "VERIFIED",
                        "01012341234",
                        "ci-value",
                        "di-value",
                        null,
                        null,
                        verifiedAt
                ));

        String completeBody = objectMapper.writeValueAsString(new CompletePayload(identityVerificationId));
        mockMvc.perform(post("/user/phone-verifications/complete")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(completeBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VERIFIED"))
                .andExpect(jsonPath("$.phoneNumber").value("+821012341234"))
                .andExpect(jsonPath("$.idempotent").value(false));

        mockMvc.perform(post("/user/phone-verifications/complete")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(completeBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VERIFIED"))
                .andExpect(jsonPath("$.idempotent").value(true));

        verify(portOneIdentityVerificationClient, times(1)).getIdentityVerification(identityVerificationId);

        UserEntity user = userRepository.findByEmail(email).orElseThrow();
        assertThat(user.getPhoneE164()).isEqualTo("+821012341234");
        assertThat(user.getIdentityVerificationId()).isEqualTo(identityVerificationId);
        assertThat(user.getPhoneVerifiedAt()).isEqualTo(verifiedAt);
        assertThat(userPhoneVerificationRepository.findByIdentityVerificationId(identityVerificationId))
                .isPresent()
                .get()
                .extracting(entity -> entity.getStatus().name())
                .isEqualTo(PhoneVerificationStatus.VERIFIED.name());
    }

    @Test
    void completeReturnsConflictWhenProviderReportsCanceled() throws Exception {
        String email = "phone-canceled-user@example.com";
        String password = "password123";
        createUserWithUserRole(email, password);
        String accessToken = issueAccessToken(email, password);

        String startResponse = mockMvc.perform(post("/user/phone-verifications/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String identityVerificationId = objectMapper.readTree(startResponse).get("identityVerificationId").asText();

        when(portOneIdentityVerificationClient.getIdentityVerification(identityVerificationId))
                .thenReturn(new PortOneIdentityVerificationClient.PortOneIdentityVerificationResult(
                        "FAILED",
                        null,
                        null,
                        null,
                        "CANCELED_BY_USER",
                        "User canceled verification.",
                        null
                ));

        String completeBody = objectMapper.writeValueAsString(new CompletePayload(identityVerificationId));
        mockMvc.perform(post("/user/phone-verifications/complete")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(completeBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PHONE_VERIFICATION_CANCELED"))
                .andExpect(jsonPath("$.requestId").isNotEmpty());

        assertThat(userPhoneVerificationRepository.findByIdentityVerificationId(identityVerificationId))
                .isPresent()
                .get()
                .extracting(entity -> entity.getStatus().name())
                .isEqualTo(PhoneVerificationStatus.CANCELED.name());
    }

    @Test
    void completeReturnsGatewayTimeoutWhenProviderTimesOut() throws Exception {
        String email = "phone-timeout-user@example.com";
        String password = "password123";
        createUserWithUserRole(email, password);
        String accessToken = issueAccessToken(email, password);

        String startResponse = mockMvc.perform(post("/user/phone-verifications/start")
                        .header("Authorization", "Bearer " + accessToken))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String identityVerificationId = objectMapper.readTree(startResponse).get("identityVerificationId").asText();

        when(portOneIdentityVerificationClient.getIdentityVerification(identityVerificationId))
                .thenThrow(new PhoneVerificationException(
                        HttpStatus.GATEWAY_TIMEOUT,
                        "PHONE_VERIFICATION_TIMEOUT",
                        "Timeout while fetching verification status."
                ));

        String completeBody = objectMapper.writeValueAsString(new CompletePayload(identityVerificationId));
        mockMvc.perform(post("/user/phone-verifications/complete")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(completeBody))
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.code").value("PHONE_VERIFICATION_TIMEOUT"))
                .andExpect(jsonPath("$.requestId").isNotEmpty());
    }

    private void createUserWithUserRole(String email, String password) {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode(password),
                "phone verification test user",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        ensureRole("USER", "General user");
        jdbcTemplate.update(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT ?, id FROM roles WHERE code = ?
                """,
                user.getId(),
                "USER"
        );
    }

    private void ensureRole(String code, String description) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM roles WHERE code = ?",
                Integer.class,
                code
        );
        if (count == null || count == 0) {
            jdbcTemplate.update("INSERT INTO roles (code, description) VALUES (?, ?)", code, description);
        }
    }

    private String issueAccessToken(String email, String password) throws Exception {
        String loginBody = objectMapper.writeValueAsString(new LoginPayload(email, password));
        String loginResponse = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode jsonNode = objectMapper.readTree(loginResponse);
        return jsonNode.get("accessToken").asText();
    }

    private record LoginPayload(String email, String password) {
    }

    private record CompletePayload(String identityVerificationId) {
    }
}
