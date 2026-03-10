package com.delivery.notification.service;

import com.delivery.auth.entity.UserEntity;

import java.time.LocalDate;
import java.util.List;

public interface CouponExpiringNotificationTargetReader {

    List<CouponExpiringNotificationTarget> readTargets(LocalDate expiresOn, int batchSize);

    record CouponExpiringNotificationTarget(
            UserEntity user,
            Long couponId,
            String couponCode,
            LocalDate expiresOn
    ) {
    }
}
