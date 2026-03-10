package com.delivery.notification.service;

import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LoggingPushNotificationSender implements PushNotificationSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingPushNotificationSender.class);

    @Override
    public void send(
            UserPushTokenEntity token,
            NotificationType type,
            String title,
            String message,
            String payloadJson
    ) {
        // T-0812에서 실제 Expo Push 발송 구현으로 교체한다.
        log.info(
                "push.notification queued provider={} tokenId={} type={} title={} payload={}",
                token.getProvider(),
                token.getId(),
                type,
                title,
                payloadJson
        );
    }
}
