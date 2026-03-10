package com.delivery.notification.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
import com.delivery.notification.repository.NotificationRepository;
import com.delivery.notification.repository.UserPushTokenRepository;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.service.WasteOrderNoPolicy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WasteRequestMeasuredNotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserPushTokenRepository userPushTokenRepository;

    @Mock
    private PushNotificationSender pushNotificationSender;

    @InjectMocks
    private WasteRequestMeasuredNotificationService service;

    @Test
    void doesNotCreateDuplicateNotificationForSameMeasuredRequest() {
        WasteRequestEntity request = createMeasuredRequest();
        AtomicBoolean alreadyExists = new AtomicBoolean(false);
        when(notificationRepository.existsByUserAndTypeAndPayloadJson(
                request.getUser(),
                NotificationType.WASTE_REQUEST_MEASURED,
                "{\"wasteRequestId\":101,\"orderNo\":\"WR-000101\",\"measuredWeightKg\":\"3.75\",\"finalAmount\":3750}"
        )).thenAnswer(invocation -> {
            if (alreadyExists.get()) {
                return true;
            }
            alreadyExists.set(true);
            return false;
        });
        when(userPushTokenRepository.findAllByUserAndActiveTrue(request.getUser()))
                .thenReturn(List.of());

        service.notifyMeasured(request);
        service.notifyMeasured(request);

        ArgumentCaptor<NotificationEntity> entityCaptor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepository, times(1)).save(entityCaptor.capture());
        NotificationEntity saved = entityCaptor.getValue();
        assertEquals(NotificationType.WASTE_REQUEST_MEASURED, saved.getType());
        assertEquals("수거가 완료되었어요", saved.getTitle());
        assertEquals(
                "주문번호 WR-000101, 측정 무게 3.75kg / 결제가 진행될 예정입니다.",
                saved.getMessage()
        );
        assertTrue(saved.getPayloadJson().contains("\"wasteRequestId\":101"));
        assertTrue(saved.getPayloadJson().contains("\"finalAmount\":3750"));
    }

    @Test
    void keepsNotificationRecordWhenPushSendFails() {
        WasteRequestEntity request = createMeasuredRequest();
        UserPushTokenEntity token = new UserPushTokenEntity(
                request.getUser(),
                PushTokenDeviceType.ANDROID,
                PushTokenProvider.EXPO,
                "ExponentPushToken[test-token]"
        );
        when(notificationRepository.existsByUserAndTypeAndPayloadJson(
                any(UserEntity.class),
                any(NotificationType.class),
                anyString()
        )).thenReturn(false);
        when(userPushTokenRepository.findAllByUserAndActiveTrue(request.getUser()))
                .thenReturn(List.of(token));
        doThrow(new RuntimeException("push sender failed"))
                .when(pushNotificationSender)
                .send(any(UserPushTokenEntity.class), any(NotificationType.class), anyString(), anyString(), anyString());

        service.notifyMeasured(request);

        verify(notificationRepository, times(1)).save(any(NotificationEntity.class));
        verify(pushNotificationSender, times(1))
                .send(any(UserPushTokenEntity.class), any(NotificationType.class), anyString(), anyString(), anyString());
    }

    private WasteRequestEntity createMeasuredRequest() {
        UserEntity user = new UserEntity(
                "measured-user@example.com",
                "encoded-password",
                "Measured User",
                "ACTIVE"
        );
        UserEntity driver = new UserEntity(
                "measured-driver@example.com",
                "encoded-password",
                "Measured Driver",
                "ACTIVE"
        );

        WasteRequestEntity request = new WasteRequestEntity(
                user,
                "서울특별시 관악구 봉천동 1-1",
                "+821012345678",
                "측정 테스트",
                "MEASURED",
                "KRW",
                List.of("GENERAL"),
                1
        );
        request.markMeasured(new BigDecimal("3.750"), driver, Instant.parse("2026-03-10T00:00:00Z"));
        request.updateFinalAmount(3750L);

        setIdAndOrderNo(request, 101L);
        return request;
    }

    private void setIdAndOrderNo(WasteRequestEntity request, Long id) {
        try {
            var idField = WasteRequestEntity.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(request, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
        request.assignOrderNo(WasteOrderNoPolicy.generate(id));
    }
}
