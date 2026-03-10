package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.repository.NotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
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
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserNotificationIntegrationTest {

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
    private NotificationRepository notificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        upsertRole("USER", "General User");
        jdbcTemplate.update("DELETE FROM notifications");
    }

    @Test
    void userCanListOwnNotificationsAndMarkRead() throws Exception {
        TestUser owner = createUserAndLogin("notification-owner-" + UUID.randomUUID() + "@example.com");
        TestUser other = createUserAndLogin("notification-other-" + UUID.randomUUID() + "@example.com");

        UserEntity ownerEntity = getUserByLoginId(owner.loginId());
        UserEntity otherEntity = getUserByLoginId(other.loginId());

        NotificationEntity ownerUnread = createNotification(
                ownerEntity,
                NotificationType.WASTE_REQUEST_CREATED,
                "내 미읽음 알림",
                "수거 신청이 접수되었습니다."
        );
        NotificationEntity ownerRead = createNotification(
                ownerEntity,
                NotificationType.PAYMENT_COMPLETED,
                "내 읽음 알림",
                "결제가 완료되었습니다."
        );
        ownerRead.markRead(Instant.now());
        notificationRepository.save(ownerRead);

        NotificationEntity otherNotification = createNotification(
                otherEntity,
                NotificationType.ADMIN_BROADCAST,
                "타인 알림",
                "운영 공지입니다."
        );

        String notificationsResponse = mockMvc.perform(get("/user/notifications")
                        .header("Authorization", "Bearer " + owner.accessToken()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode notifications = objectMapper.readTree(notificationsResponse);
        assertEquals(2, notifications.size());

        Set<Long> notificationIds = new HashSet<>();
        for (JsonNode notification : notifications) {
            notificationIds.add(notification.get("id").asLong());
            assertTrue(notification.has("type"));
            assertTrue(notification.has("title"));
            assertTrue(notification.has("message"));
            assertTrue(notification.has("isRead"));
            assertTrue(notification.has("createdAt"));
        }
        assertTrue(notificationIds.contains(ownerUnread.getId()));
        assertTrue(notificationIds.contains(ownerRead.getId()));
        assertFalse(notificationIds.contains(otherNotification.getId()));

        mockMvc.perform(get("/user/notifications/unread-count")
                        .header("Authorization", "Bearer " + owner.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));

        mockMvc.perform(post("/user/notifications/{id}/read", ownerUnread.getId())
                        .header("Authorization", "Bearer " + owner.accessToken()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/user/notifications/unread-count")
                        .header("Authorization", "Bearer " + owner.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        NotificationEntity refreshed = notificationRepository.findById(ownerUnread.getId()).orElseThrow();
        assertTrue(refreshed.isRead());
    }

    @Test
    void userCannotReadAnotherUsersNotification() throws Exception {
        TestUser owner = createUserAndLogin("notification-owner-read-" + UUID.randomUUID() + "@example.com");
        TestUser other = createUserAndLogin("notification-other-read-" + UUID.randomUUID() + "@example.com");
        UserEntity ownerEntity = getUserByLoginId(owner.loginId());

        NotificationEntity ownerNotification = createNotification(
                ownerEntity,
                NotificationType.WASTE_REQUEST_MEASURED,
                "타인 읽기 차단 테스트",
                "타인이 읽을 수 없어야 합니다."
        );

        mockMvc.perform(post("/user/notifications/{id}/read", ownerNotification.getId())
                        .header("Authorization", "Bearer " + other.accessToken()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOTIFICATION_ACCESS_DENIED"));
    }

    private NotificationEntity createNotification(
            UserEntity user,
            NotificationType type,
            String title,
            String message
    ) {
        return notificationRepository.save(new NotificationEntity(user, type, title, message, "{}"));
    }

    private TestUser createUserAndLogin(String loginId) throws Exception {
        UserEntity user = userRepository.save(new UserEntity(
                loginId,
                passwordEncoder.encode(DEFAULT_PASSWORD),
                "Notification Tester",
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
        return new TestUser(
                loginId,
                objectMapper.readTree(loginResponse).get("accessToken").asText()
        );
    }

    private UserEntity getUserByLoginId(String loginId) {
        return userRepository.findByLoginId(loginId).orElseThrow();
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

    private record TestUser(String loginId, String accessToken) {
    }
}
