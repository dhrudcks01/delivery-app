package com.delivery.notification.web;

import com.delivery.notification.dto.DeactivatePushTokenRequest;
import com.delivery.notification.dto.RegisterPushTokenRequest;
import com.delivery.notification.service.UserPushTokenService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/push-tokens")
public class UserPushTokenController {

    private final UserPushTokenService userPushTokenService;

    public UserPushTokenController(UserPushTokenService userPushTokenService) {
        this.userPushTokenService = userPushTokenService;
    }

    @PostMapping
    public ResponseEntity<Void> registerPushToken(
            Authentication authentication,
            @Valid @RequestBody RegisterPushTokenRequest request
    ) {
        userPushTokenService.registerOrReactivateToken(
                authentication.getName(),
                request.deviceType(),
                request.provider(),
                request.pushToken()
        );
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/deactivate")
    public ResponseEntity<Void> deactivatePushToken(
            Authentication authentication,
            @Valid @RequestBody DeactivatePushTokenRequest request
    ) {
        userPushTokenService.deactivateToken(
                authentication.getName(),
                request.provider(),
                request.pushToken()
        );
        return ResponseEntity.noContent().build();
    }
}
