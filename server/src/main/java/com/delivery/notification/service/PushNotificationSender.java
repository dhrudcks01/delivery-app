package com.delivery.notification.service;

import com.delivery.notification.entity.UserPushTokenEntity;
import com.delivery.notification.model.NotificationType;

public interface PushNotificationSender {

    void send(
            UserPushTokenEntity token,
            NotificationType type,
            String title,
            String message,
            String payloadJson
    );
}
