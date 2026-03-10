package com.delivery.notification.service;

import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.repository.NotificationRepository;
import com.delivery.notification.repository.UserPushTokenRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class CouponExpiringNotificationService {

    private static final Logger log = LoggerFactory.getLogger(CouponExpiringNotificationService.class);
    private static final NotificationType TYPE = NotificationType.COUPON_EXPIRING;
    private static final String TITLE = "쿠폰 만료 예정 안내";

    private final CouponExpiringNotificationTargetReader couponExpiringNotificationTargetReader;
    private final NotificationRepository notificationRepository;
    private final UserPushTokenRepository userPushTokenRepository;
    private final PushNotificationSender pushNotificationSender;

    public CouponExpiringNotificationService(
            CouponExpiringNotificationTargetReader couponExpiringNotificationTargetReader,
            NotificationRepository notificationRepository,
            UserPushTokenRepository userPushTokenRepository,
            PushNotificationSender pushNotificationSender
    ) {
        this.couponExpiringNotificationTargetReader = couponExpiringNotificationTargetReader;
        this.notificationRepository = notificationRepository;
        this.userPushTokenRepository = userPushTokenRepository;
        this.pushNotificationSender = pushNotificationSender;
    }

    @Transactional
    public int notifyExpiringCoupons(LocalDate referenceDate, int daysBeforeExpiry, int batchSize) {
        if (referenceDate == null || daysBeforeExpiry <= 0 || batchSize <= 0) {
            return 0;
        }

        LocalDate targetExpiryDate = referenceDate.plusDays(daysBeforeExpiry);
        List<CouponExpiringNotificationTargetReader.CouponExpiringNotificationTarget> targets =
                couponExpiringNotificationTargetReader.readTargets(targetExpiryDate, batchSize);
        if (targets == null || targets.isEmpty()) {
            return 0;
        }

        int createdCount = 0;
        for (CouponExpiringNotificationTargetReader.CouponExpiringNotificationTarget target : targets) {
            if (target == null || target.user() == null || target.expiresOn() == null) {
                continue;
            }
            String payloadJson = buildPayloadJson(
                    target.couponId(),
                    target.couponCode(),
                    target.expiresOn(),
                    daysBeforeExpiry
            );
            if (notificationRepository.existsByUserAndTypeAndPayloadJson(target.user(), TYPE, payloadJson)) {
                continue;
            }

            String message = buildMessage(target.couponCode(), daysBeforeExpiry, target.expiresOn());
            notificationRepository.save(new NotificationEntity(
                    target.user(),
                    TYPE,
                    TITLE,
                    message,
                    payloadJson
            ));
            createdCount++;

            List<UserPushTokenEntity> activeTokens = userPushTokenRepository.findAllByUserAndActiveTrue(target.user());
            for (UserPushTokenEntity token : activeTokens) {
                try {
                    pushNotificationSender.send(token, TYPE, TITLE, message, payloadJson);
                } catch (RuntimeException ex) {
                    log.warn(
                            "push.notification failed userId={} couponId={} tokenId={} reason={}",
                            target.user().getId(),
                            target.couponId(),
                            token.getId(),
                            ex.getMessage()
                    );
                }
            }
        }

        return createdCount;
    }

    private String buildMessage(String couponCode, int daysBeforeExpiry, LocalDate expiresOn) {
        String couponLabel = couponCode == null || couponCode.isBlank()
                ? "보유 쿠폰"
                : "쿠폰 " + couponCode;
        return "%s이 %d일 후(%s) 만료됩니다. 기간 내 사용해 주세요."
                .formatted(couponLabel, daysBeforeExpiry, expiresOn);
    }

    private String buildPayloadJson(
            Long couponId,
            String couponCode,
            LocalDate expiresOn,
            int daysBeforeExpiry
    ) {
        String couponIdJson = couponId == null ? "null" : couponId.toString();
        return "{\"event\":\"COUPON_EXPIRING\",\"couponId\":%s,\"couponCode\":\"%s\",\"expiresOn\":\"%s\",\"daysBeforeExpiry\":%d,\"deepLink\":\"/coupons\"}"
                .formatted(
                        couponIdJson,
                        escapeJson(nullToEmpty(couponCode)),
                        escapeJson(expiresOn.toString()),
                        daysBeforeExpiry
                );
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }
}
