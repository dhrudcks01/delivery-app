package com.delivery.notification.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.model.PushTokenDeviceType;
import com.delivery.notification.model.PushTokenProvider;
import com.delivery.notification.repository.NotificationRepository;
import com.delivery.notification.repository.UserPushTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CouponExpiringNotificationServiceTest {

    @Mock
    private CouponExpiringNotificationTargetReader couponExpiringNotificationTargetReader;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserPushTokenRepository userPushTokenRepository;

    @Mock
    private PushNotificationSender pushNotificationSender;

    @InjectMocks
    private CouponExpiringNotificationService service;

    @Test
    void createsNotificationOnlyOnceForSameCouponAndPolicy() {
        UserEntity user = createUser();
        CouponExpiringNotificationTargetReader.CouponExpiringNotificationTarget target =
                new CouponExpiringNotificationTargetReader.CouponExpiringNotificationTarget(
                        user,
                        301L,
                        "WELCOME10",
                        LocalDate.parse("2026-03-15")
                );

        when(couponExpiringNotificationTargetReader.readTargets(LocalDate.parse("2026-03-15"), 200))
                .thenReturn(List.of(target));
        when(userPushTokenRepository.findAllByUserAndActiveTrue(user)).thenReturn(List.of());

        AtomicBoolean alreadyExists = new AtomicBoolean(false);
        when(notificationRepository.existsByUserAndTypeAndPayloadJson(
                eq(user),
                eq(NotificationType.COUPON_EXPIRING),
                anyString()
        )).thenAnswer(invocation -> {
            if (alreadyExists.get()) {
                return true;
            }
            alreadyExists.set(true);
            return false;
        });

        int firstCreated = service.notifyExpiringCoupons(LocalDate.parse("2026-03-12"), 3, 200);
        int secondCreated = service.notifyExpiringCoupons(LocalDate.parse("2026-03-12"), 3, 200);

        assertEquals(1, firstCreated);
        assertEquals(0, secondCreated);

        ArgumentCaptor<NotificationEntity> entityCaptor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepository, times(1)).save(entityCaptor.capture());
        NotificationEntity saved = entityCaptor.getValue();
        assertEquals(NotificationType.COUPON_EXPIRING, saved.getType());
        assertEquals("쿠폰 만료 예정 안내", saved.getTitle());
        assertEquals("쿠폰 WELCOME10이 3일 후(2026-03-15) 만료됩니다. 기간 내 사용해 주세요.", saved.getMessage());
        assertTrue(saved.getPayloadJson().contains("\"event\":\"COUPON_EXPIRING\""));
        assertTrue(saved.getPayloadJson().contains("\"couponId\":301"));
        assertTrue(saved.getPayloadJson().contains("\"daysBeforeExpiry\":3"));
    }

    @Test
    void keepsNotificationRecordWhenPushSendFails() {
        UserEntity user = createUser();
        CouponExpiringNotificationTargetReader.CouponExpiringNotificationTarget target =
                new CouponExpiringNotificationTargetReader.CouponExpiringNotificationTarget(
                        user,
                        302L,
                        "SPRING50",
                        LocalDate.parse("2026-03-13")
                );
        UserPushTokenEntity token = new UserPushTokenEntity(
                user,
                PushTokenDeviceType.ANDROID,
                PushTokenProvider.EXPO,
                "ExponentPushToken[coupon-expiring]"
        );
        when(couponExpiringNotificationTargetReader.readTargets(LocalDate.parse("2026-03-13"), 100))
                .thenReturn(List.of(target));
        when(notificationRepository.existsByUserAndTypeAndPayloadJson(
                eq(user),
                eq(NotificationType.COUPON_EXPIRING),
                anyString()
        )).thenReturn(false);
        when(userPushTokenRepository.findAllByUserAndActiveTrue(user)).thenReturn(List.of(token));
        doThrow(new RuntimeException("push send failed"))
                .when(pushNotificationSender)
                .send(any(UserPushTokenEntity.class), any(NotificationType.class), anyString(), anyString(), anyString());

        int created = service.notifyExpiringCoupons(LocalDate.parse("2026-03-12"), 1, 100);

        assertEquals(1, created);
        verify(notificationRepository, times(1)).save(any(NotificationEntity.class));
        verify(pushNotificationSender, times(1))
                .send(any(UserPushTokenEntity.class), any(NotificationType.class), anyString(), anyString(), anyString());
    }

    private UserEntity createUser() {
        return new UserEntity(
                "coupon-user@example.com",
                "encoded-password",
                "Coupon User",
                "ACTIVE"
        );
    }
}
