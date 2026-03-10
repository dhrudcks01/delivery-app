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

import java.util.List;

@Service
public class WasteRequestPaymentCompletedNotificationService {

    private static final Logger log = LoggerFactory.getLogger(WasteRequestPaymentCompletedNotificationService.class);
    private static final NotificationType TYPE = NotificationType.PAYMENT_COMPLETED;
    private static final String TITLE = "결제가 완료되었어요";

    private final NotificationRepository notificationRepository;
    private final UserPushTokenRepository userPushTokenRepository;
    private final PushNotificationSender pushNotificationSender;

    public WasteRequestPaymentCompletedNotificationService(
            NotificationRepository notificationRepository,
            UserPushTokenRepository userPushTokenRepository,
            PushNotificationSender pushNotificationSender
    ) {
        this.notificationRepository = notificationRepository;
        this.userPushTokenRepository = userPushTokenRepository;
        this.pushNotificationSender = pushNotificationSender;
    }

    @Transactional
    public void notifyPaymentCompleted(WasteRequestEntity request) {
        String orderNo = WasteOrderNoPolicy.resolve(request.getOrderNo(), request.getId());
        Long finalAmount = request.getFinalAmount() == null ? 0L : request.getFinalAmount();
        String payloadJson = buildPayloadJson(request.getId(), orderNo, finalAmount);

        if (notificationRepository.existsByUserAndTypeAndPayloadJson(request.getUser(), TYPE, payloadJson)) {
            return;
        }

        String message = "주문번호 %s, %d원 결제가 완료되었습니다.".formatted(orderNo, finalAmount);
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

    private String buildPayloadJson(Long wasteRequestId, String orderNo, Long finalAmount) {
        return "{\"wasteRequestId\":%d,\"orderNo\":\"%s\",\"finalAmount\":%d}".formatted(
                wasteRequestId,
                escapeJson(orderNo),
                finalAmount
        );
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }
}
