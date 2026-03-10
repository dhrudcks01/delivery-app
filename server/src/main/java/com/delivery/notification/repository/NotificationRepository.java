package com.delivery.notification.repository;

import com.delivery.auth.entity.UserEntity;
import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.model.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    List<NotificationEntity> findAllByUserOrderByCreatedAtDesc(UserEntity user);

    boolean existsByUserAndTypeAndPayloadJson(
            UserEntity user,
            NotificationType type,
            String payloadJson
    );

    long countByUserAndReadFalse(UserEntity user);

    long countByUserAndType(UserEntity user, NotificationType type);

    Optional<NotificationEntity> findFirstByUserAndTypeOrderByCreatedAtDesc(
            UserEntity user,
            NotificationType type
    );
}
