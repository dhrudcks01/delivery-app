package com.delivery.notification.web;

import com.delivery.notification.dto.NotificationBroadcastRequest;
import com.delivery.notification.dto.NotificationBroadcastResponse;
import com.delivery.notification.service.OpsAdminNotificationBroadcastService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ops-admin/notifications")
public class OpsAdminNotificationBroadcastController {

    private final OpsAdminNotificationBroadcastService opsAdminNotificationBroadcastService;

    public OpsAdminNotificationBroadcastController(
            OpsAdminNotificationBroadcastService opsAdminNotificationBroadcastService
    ) {
        this.opsAdminNotificationBroadcastService = opsAdminNotificationBroadcastService;
    }

    @PostMapping("/broadcast")
    public ResponseEntity<NotificationBroadcastResponse> broadcast(
            Authentication authentication,
            @Valid @RequestBody NotificationBroadcastRequest request
    ) {
        NotificationBroadcastResponse response = opsAdminNotificationBroadcastService.broadcast(
                authentication.getName(),
                request
        );
        return ResponseEntity.ok(response);
    }
}
