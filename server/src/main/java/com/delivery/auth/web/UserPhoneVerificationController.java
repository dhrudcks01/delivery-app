package com.delivery.auth.web;

import com.delivery.auth.dto.CompletePhoneVerificationRequest;
import com.delivery.auth.dto.PhoneVerificationCompleteResponse;
import com.delivery.auth.dto.PhoneVerificationStartResponse;
import com.delivery.auth.service.PhoneVerificationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/phone-verifications")
public class UserPhoneVerificationController {

    private final PhoneVerificationService phoneVerificationService;

    public UserPhoneVerificationController(PhoneVerificationService phoneVerificationService) {
        this.phoneVerificationService = phoneVerificationService;
    }

    @PostMapping("/start")
    public ResponseEntity<PhoneVerificationStartResponse> start(Authentication authentication) {
        PhoneVerificationStartResponse response = phoneVerificationService.start(authentication.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/complete")
    public ResponseEntity<PhoneVerificationCompleteResponse> complete(
            Authentication authentication,
            @Valid @RequestBody CompletePhoneVerificationRequest request
    ) {
        PhoneVerificationCompleteResponse response = phoneVerificationService.complete(
                authentication.getName(),
                request.identityVerificationId()
        );
        return ResponseEntity.ok(response);
    }
}
