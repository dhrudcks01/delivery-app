package com.delivery;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.UserRepository;
import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
import com.delivery.notification.repository.NotificationRepository;
import com.delivery.notification.repository.UserPushTokenRepository;
import com.delivery.notification.service.PushNotificationSender;
import com.delivery.notification.service.WasteRequestCreatedNotificationService;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.repository.WasteRequestRepository;
import com.delivery.waste.service.WasteOrderNoPolicy;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;

@SpringBootTest
@ActiveProfiles("test")
class WasteRequestCreatedNotificationServiceIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WasteRequestRepository wasteRequestRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserPushTokenRepository userPushTokenRepository;

    @Autowired
    private WasteRequestCreatedNotificationService wasteRequestCreatedNotificationService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private PushNotificationSender pushNotificationSender;

    @Test
    void createsNotificationOnlyOnceForSameWasteRequest() {
        UserEntity user = createUser();
        WasteRequestEntity request = createWasteRequest(user);

        wasteRequestCreatedNotificationService.notifyCreated(request);
        wasteRequestCreatedNotificationService.notifyCreated(request);

        assertEquals(
                1L,
                notificationRepository.countByUserAndType(user, NotificationType.WASTE_REQUEST_CREATED)
        );
        NotificationEntity saved = notificationRepository.findFirstByUserAndTypeOrderByCreatedAtDesc(
                        user,
                        NotificationType.WASTE_REQUEST_CREATED
                )
                .orElseThrow();
        assertEquals("수거 신청이 접수되었어요", saved.getTitle());
        assertEquals(
                "주문번호 %s 요청이 정상 접수되었습니다.".formatted(request.getOrderNo()),
                saved.getMessage()
        );
        assertNotNull(saved.getPayloadJson());
        assertTrue(saved.getPayloadJson().contains("\"wasteRequestId\":" + request.getId()));
    }

    @Test
    void keepsNotificationRecordEvenWhenPushSendFails() {
        UserEntity user = createUser();
        WasteRequestEntity request = createWasteRequest(user);
        userPushTokenRepository.save(new UserPushTokenEntity(
                user,
                PushTokenDeviceType.ANDROID,
                PushTokenProvider.EXPO,
                "ExponentPushToken[" + UUID.randomUUID() + "]"
        ));
        doThrow(new RuntimeException("push send failed"))
                .when(pushNotificationSender)
                .send(any(UserPushTokenEntity.class), any(NotificationType.class), anyString(), anyString(), anyString());

        wasteRequestCreatedNotificationService.notifyCreated(request);

        assertEquals(
                1L,
                notificationRepository.countByUserAndType(user, NotificationType.WASTE_REQUEST_CREATED)
        );
    }

    private UserEntity createUser() {
        return userRepository.save(new UserEntity(
                "notification-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode("password123"),
                "Notification Tester",
                "ACTIVE"
        ));
    }

    private WasteRequestEntity createWasteRequest(UserEntity user) {
        WasteRequestEntity request = wasteRequestRepository.save(new WasteRequestEntity(
                user,
                "서울특별시 관악구 봉천동 1-1",
                "+821012345678",
                "테스트 요청",
                "REQUESTED",
                "KRW",
                List.of("GENERAL"),
                1
        ));
        request.assignOrderNo(WasteOrderNoPolicy.generate(request.getId()));
        return wasteRequestRepository.save(request);
    }
}
