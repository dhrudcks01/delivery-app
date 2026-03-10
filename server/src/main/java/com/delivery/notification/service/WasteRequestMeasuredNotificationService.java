package com.delivery.notification.service;

import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import com.delivery.notification.repository.NotificationRepository;
import com.delivery.notification.repository.UserPushTokenRepository;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.service.WasteOrderNoPolicy;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class WasteRequestMeasuredNotificationService {

    private static final Logger log = LoggerFactory.getLogger(WasteRequestMeasuredNotificationService.class);
    private static final NotificationType TYPE = NotificationType.WASTE_REQUEST_MEASURED;
    private static final String TITLE = "수거가 완료되었어요";

    private final NotificationRepository notificationRepository;
    private final UserPushTokenRepository userPushTokenRepository;
    private final PushNotificationSender pushNotificationSender;

    public WasteRequestMeasuredNotificationService(
            NotificationRepository notificationRepository,
            UserPushTokenRepository userPushTokenRepository,
            PushNotificationSender pushNotificationSender
    ) {
        this.notificationRepository = notificationRepository;
        this.userPushTokenRepository = userPushTokenRepository;
        this.pushNotificationSender = pushNotificationSender;
    }

    @Transactional
    public void notifyMeasured(WasteRequestEntity request) {
        String orderNo = WasteOrderNoPolicy.resolve(request.getOrderNo(), request.getId());
        String measuredWeightText = toWeightText(request.getMeasuredWeightKg());
        String payloadJson = buildPayloadJson(
                request.getId(),
                orderNo,
                measuredWeightText,
                request.getFinalAmount()
        );
        if (notificationRepository.existsByUserAndTypeAndPayloadJson(request.getUser(), TYPE, payloadJson)) {
            return;
        }

        String message = "주문번호 %s, 측정 무게 %skg / 결제가 진행될 예정입니다."
                .formatted(orderNo, measuredWeightText);
        notificationRepository.save(new NotificationEntity(
                request.getUser(),
                TYPE,
                TITLE,
                message,
                payloadJson
        ));

        List<UserPushTokenEntity> activeTokens = userPushTokenRepository.findAllByUserAndActiveTrue(request.getUser());
        for (UserPushTokenEntity token : activeTokens) {
            try {
                pushNotificationSender.send(token, TYPE, TITLE, message, payloadJson);
            } catch (RuntimeException ex) {
                log.warn(
                        "push.notification failed userId={} requestId={} tokenId={} reason={}",
                        request.getUser().getId(),
                        request.getId(),
                        token.getId(),
                        ex.getMessage()
                );
            }
        }
    }

    private String buildPayloadJson(
            Long wasteRequestId,
            String orderNo,
            String measuredWeightKg,
            Long finalAmount
    ) {
        return "{\"wasteRequestId\":%d,\"orderNo\":\"%s\",\"measuredWeightKg\":\"%s\",\"finalAmount\":%d}"
                .formatted(
                        wasteRequestId,
                        escapeJson(orderNo),
                        escapeJson(measuredWeightKg),
                        finalAmount == null ? 0L : finalAmount
                );
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private String toWeightText(BigDecimal measuredWeightKg) {
        if (measuredWeightKg == null) {
            return "0";
        }
        return measuredWeightKg.stripTrailingZeros().toPlainString();
    }
}
