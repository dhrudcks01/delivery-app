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
class WasteRequestPaymentCompletedNotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserPushTokenRepository userPushTokenRepository;

    @Mock
    private PushNotificationSender pushNotificationSender;

    @InjectMocks
    private WasteRequestPaymentCompletedNotificationService service;

    @Test
    void doesNotCreateDuplicateNotificationForSameCompletedRequest() {
        WasteRequestEntity request = createCompletedRequest();
        AtomicBoolean alreadyExists = new AtomicBoolean(false);
        when(notificationRepository.existsByUserAndTypeAndPayloadJson(
                request.getUser(),
                NotificationType.PAYMENT_COMPLETED,
                "{\"wasteRequestId\":201,\"orderNo\":\"WR-000201\",\"finalAmount\":4250}"
        )).thenAnswer(invocation -> {
            if (alreadyExists.get()) {
                return true;
            }
            alreadyExists.set(true);
            return false;
        });
        when(userPushTokenRepository.findAllByUserAndActiveTrue(request.getUser()))
                .thenReturn(List.of());

        service.notifyPaymentCompleted(request);
        service.notifyPaymentCompleted(request);

        ArgumentCaptor<NotificationEntity> entityCaptor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepository, times(1)).save(entityCaptor.capture());
        NotificationEntity saved = entityCaptor.getValue();
        assertEquals(NotificationType.PAYMENT_COMPLETED, saved.getType());
        assertEquals("결제가 완료되었어요", saved.getTitle());
        assertEquals("주문번호 WR-000201, 4250원 결제가 완료되었습니다.", saved.getMessage());
        assertTrue(saved.getPayloadJson().contains("\"wasteRequestId\":201"));
        assertTrue(saved.getPayloadJson().contains("\"finalAmount\":4250"));
    }

    @Test
    void keepsNotificationRecordWhenPushSendFails() {
        WasteRequestEntity request = createCompletedRequest();
        UserPushTokenEntity token = new UserPushTokenEntity(
                request.getUser(),
                PushTokenDeviceType.IOS,
                PushTokenProvider.EXPO,
                "ExponentPushToken[completed-token]"
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

        service.notifyPaymentCompleted(request);

        verify(notificationRepository, times(1)).save(any(NotificationEntity.class));
        verify(pushNotificationSender, times(1))
                .send(any(UserPushTokenEntity.class), any(NotificationType.class), anyString(), anyString(), anyString());
    }

    private WasteRequestEntity createCompletedRequest() {
        UserEntity user = new UserEntity(
                "completed-user@example.com",
                "encoded-password",
                "Completed User",
                "ACTIVE"
        );
        WasteRequestEntity request = new WasteRequestEntity(
                user,
                "서울특별시 관악구 봉천동 9-1",
                "+821055555555",
                "결제 완료 테스트",
                "COMPLETED",
                "KRW",
                List.of("GENERAL"),
                1
        );
        request.updateFinalAmount(4250L);

        setIdAndOrderNo(request, 201L);
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
