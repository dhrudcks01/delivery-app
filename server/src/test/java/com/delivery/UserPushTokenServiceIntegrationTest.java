package com.delivery;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.UserRepository;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
import com.delivery.notification.repository.UserPushTokenRepository;
import com.delivery.notification.service.UserPushTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class UserPushTokenServiceIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserPushTokenRepository userPushTokenRepository;

    @Autowired
    private UserPushTokenService userPushTokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM user_push_tokens");
    }

    @Test
    void sameTokenIsUpsertedAndReactivatedWithoutDuplicateRows() {
        String loginId = "push-token-" + UUID.randomUUID() + "@example.com";
        UserEntity user = userRepository.save(new UserEntity(
                loginId,
                passwordEncoder.encode("password123"),
                "Push Token Tester",
                "ACTIVE"
        ));
        String pushToken = "ExponentPushToken[duplicate-check-token]";

        userPushTokenService.registerOrReactivateToken(
                loginId,
                PushTokenDeviceType.IOS,
                PushTokenProvider.EXPO,
                pushToken
        );

        UserPushTokenEntity firstSaved = userPushTokenRepository
                .findByUserAndProviderAndPushToken(user, PushTokenProvider.EXPO, pushToken)
                .orElseThrow();
        firstSaved.deactivate();
        userPushTokenRepository.save(firstSaved);
        assertFalse(firstSaved.isActive());

        userPushTokenService.registerOrReactivateToken(
                loginId,
                PushTokenDeviceType.ANDROID,
                PushTokenProvider.EXPO,
                pushToken
        );

        assertEquals(
                1L,
                userPushTokenRepository.countByUserAndProviderAndPushToken(user, PushTokenProvider.EXPO, pushToken)
        );
        UserPushTokenEntity reactivated = userPushTokenRepository
                .findByUserAndProviderAndPushToken(user, PushTokenProvider.EXPO, pushToken)
                .orElseThrow();
        assertTrue(reactivated.isActive());
        assertEquals(PushTokenDeviceType.ANDROID, reactivated.getDeviceType());
    }
}
