package com.delivery.notification.service;

import com.delivery.notification.config.CouponExpiringNotificationProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CouponExpiringNotificationSchedulerTest {

    @Mock
    private CouponExpiringNotificationProperties couponExpiringNotificationProperties;

    @Mock
    private CouponExpiringNotificationService couponExpiringNotificationService;

    @InjectMocks
    private CouponExpiringNotificationScheduler scheduler;

    @Test
    void doesNotRunWhenFeatureFlagDisabled() {
        when(couponExpiringNotificationProperties.isEnabled()).thenReturn(false);

        scheduler.sendCouponExpiringNotifications();

        verifyNoInteractions(couponExpiringNotificationService);
    }

    @Test
    void runsForConfiguredDaysWhenFeatureFlagEnabled() {
        when(couponExpiringNotificationProperties.isEnabled()).thenReturn(true);
        when(couponExpiringNotificationProperties.getBatchSize()).thenReturn(300);
        when(couponExpiringNotificationProperties.getDaysBeforeExpiry()).thenReturn(List.of(3, 1, 3, 0, -1));
        when(couponExpiringNotificationService.notifyExpiringCoupons(any(LocalDate.class), anyInt(), eq(300)))
                .thenReturn(1);

        scheduler.sendCouponExpiringNotifications();

        verify(couponExpiringNotificationService, times(1))
                .notifyExpiringCoupons(any(LocalDate.class), eq(3), eq(300));
        verify(couponExpiringNotificationService, times(1))
                .notifyExpiringCoupons(any(LocalDate.class), eq(1), eq(300));
        verify(couponExpiringNotificationService, times(2))
                .notifyExpiringCoupons(any(LocalDate.class), anyInt(), eq(300));
    }
}
