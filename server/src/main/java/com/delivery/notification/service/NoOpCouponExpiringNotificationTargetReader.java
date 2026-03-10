package com.delivery.notification.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class NoOpCouponExpiringNotificationTargetReader implements CouponExpiringNotificationTargetReader {

    @Override
    public List<CouponExpiringNotificationTarget> readTargets(LocalDate expiresOn, int batchSize) {
        return List.of();
    }
}
