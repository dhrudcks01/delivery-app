package com.delivery.notification.repository;

import com.delivery.notification.entity.NotificationBroadcastHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationBroadcastHistoryRepository extends JpaRepository<NotificationBroadcastHistoryEntity, Long> {
}
