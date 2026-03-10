package com.delivery.notification.service;

import com.delivery.notification.config.CouponExpiringNotificationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;

@Service
public class CouponExpiringNotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(CouponExpiringNotificationScheduler.class);
    private static final ZoneId BASE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final List<Integer> DEFAULT_DAYS_BEFORE_EXPIRY = List.of(3, 1);

    private final CouponExpiringNotificationProperties couponExpiringNotificationProperties;
    private final CouponExpiringNotificationService couponExpiringNotificationService;

    public CouponExpiringNotificationScheduler(
            CouponExpiringNotificationProperties couponExpiringNotificationProperties,
            CouponExpiringNotificationService couponExpiringNotificationService
    ) {
        this.couponExpiringNotificationProperties = couponExpiringNotificationProperties;
        this.couponExpiringNotificationService = couponExpiringNotificationService;
    }

    @Scheduled(
            cron = "${app.notification.coupon-expiring.schedule-cron:0 0 10 * * *}",
            zone = "Asia/Seoul"
    )
    public void sendCouponExpiringNotifications() {
        if (!couponExpiringNotificationProperties.isEnabled()) {
            log.debug("coupon expiring notification scheduler is disabled");
            return;
        }

        LocalDate referenceDate = LocalDate.now(BASE_ZONE_ID);
        int batchSize = couponExpiringNotificationProperties.getBatchSize();
        for (Integer daysBeforeExpiry : normalizeDaysBeforeExpiry(
                couponExpiringNotificationProperties.getDaysBeforeExpiry()
        )) {
            int createdCount = couponExpiringNotificationService.notifyExpiringCoupons(
                    referenceDate,
                    daysBeforeExpiry,
                    batchSize
            );
            log.info(
                    "coupon expiring notifications processed referenceDate={} daysBeforeExpiry={} createdCount={}",
                    referenceDate,
                    daysBeforeExpiry,
                    createdCount
            );
        }
    }

    private List<Integer> normalizeDaysBeforeExpiry(List<Integer> configuredDays) {
        if (configuredDays == null || configuredDays.isEmpty()) {
            return DEFAULT_DAYS_BEFORE_EXPIRY;
        }
        LinkedHashSet<Integer> normalized = new LinkedHashSet<>();
        for (Integer day : configuredDays) {
            if (day == null || day <= 0) {
                continue;
            }
            normalized.add(day);
        }
        if (normalized.isEmpty()) {
            return DEFAULT_DAYS_BEFORE_EXPIRY;
        }
        return List.copyOf(normalized);
    }
}
