package com.delivery.notification.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.notification.dto.UserNotificationResponse;
import com.delivery.notification.dto.UserNotificationUnreadCountResponse;
import com.delivery.notification.entity.NotificationEntity;
import com.delivery.notification.exception.NotificationAccessDeniedException;
import com.delivery.notification.exception.NotificationNotFoundException;
import com.delivery.notification.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserNotificationService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public UserNotificationService(
            UserRepository userRepository,
            NotificationRepository notificationRepository
    ) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public List<UserNotificationResponse> getMyNotifications(String loginId) {
        UserEntity user = getUserByLoginId(loginId);
        return notificationRepository.findAllByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void markRead(String loginId, Long notificationId) {
        UserEntity user = getUserByLoginId(loginId);
        NotificationEntity notification = notificationRepository.findById(notificationId)
                .orElseThrow(NotificationNotFoundException::new);
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new NotificationAccessDeniedException();
        }
        if (notification.isRead()) {
            return;
        }
        notification.markRead(null);
        notificationRepository.save(notification);
    }

    @Transactional
    public UserNotificationUnreadCountResponse getUnreadCount(String loginId) {
        UserEntity user = getUserByLoginId(loginId);
        return new UserNotificationUnreadCountResponse(
                notificationRepository.countByUserAndReadFalse(user)
        );
    }

    private UserEntity getUserByLoginId(String loginId) {
        return userRepository.findByLoginId(loginId)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private UserNotificationResponse toResponse(NotificationEntity notification) {
        return new UserNotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
