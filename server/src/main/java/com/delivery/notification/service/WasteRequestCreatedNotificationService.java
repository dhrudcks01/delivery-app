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
public class WasteRequestCreatedNotificationService {

    private static final Logger log = LoggerFactory.getLogger(WasteRequestCreatedNotificationService.class);
    private static final NotificationType TYPE = NotificationType.WASTE_REQUEST_CREATED;
    private static final String TITLE = "수거 신청이 접수되었어요";

    private final NotificationRepository notificationRepository;
    private final UserPushTokenRepository userPushTokenRepository;
    private final PushNotificationSender pushNotificationSender;

    public WasteRequestCreatedNotificationService(
            NotificationRepository notificationRepository,
            UserPushTokenRepository userPushTokenRepository,
            PushNotificationSender pushNotificationSender
    ) {
        this.notificationRepository = notificationRepository;
        this.userPushTokenRepository = userPushTokenRepository;
        this.pushNotificationSender = pushNotificationSender;
    }

    @Transactional
    public void notifyCreated(WasteRequestEntity request) {
        String orderNo = WasteOrderNoPolicy.resolve(request.getOrderNo(), request.getId());
        String payloadJson = buildPayloadJson(request.getId(), orderNo);
        if (notificationRepository.existsByUserAndTypeAndPayloadJson(request.getUser(), TYPE, payloadJson)) {
            return;
        }

        String message = "주문번호 %s 요청이 정상 접수되었습니다.".formatted(orderNo);
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

    private String buildPayloadJson(Long wasteRequestId, String orderNo) {
        return "{\"wasteRequestId\":%d,\"orderNo\":\"%s\"}".formatted(
                wasteRequestId,
                escapeJson(orderNo)
        );
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }
}
