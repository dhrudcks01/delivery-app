package com.delivery.notification.web;

import com.delivery.notification.dto.UserNotificationResponse;
import com.delivery.notification.dto.UserNotificationUnreadCountResponse;
import com.delivery.notification.service.UserNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/user/notifications")
public class UserNotificationController {

    private final UserNotificationService userNotificationService;

    public UserNotificationController(UserNotificationService userNotificationService) {
        this.userNotificationService = userNotificationService;
    }

    @GetMapping
    public ResponseEntity<List<UserNotificationResponse>> getMyNotifications(Authentication authentication) {
        return ResponseEntity.ok(userNotificationService.getMyNotifications(authentication.getName()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UserNotificationUnreadCountResponse> getUnreadCount(Authentication authentication) {
        return ResponseEntity.ok(userNotificationService.getUnreadCount(authentication.getName()));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Void> markRead(
            Authentication authentication,
            @PathVariable Long notificationId
    ) {
        userNotificationService.markRead(authentication.getName(), notificationId);
        return ResponseEntity.noContent().build();
    }
}
