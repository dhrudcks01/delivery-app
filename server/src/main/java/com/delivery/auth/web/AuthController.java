package com.delivery.auth.web;

import com.delivery.auth.dto.AuthTokenResponse;
import com.delivery.auth.dto.LoginRequest;
import com.delivery.auth.dto.RefreshTokenRequest;
import com.delivery.auth.dto.RegisterRequest;
import com.delivery.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthTokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthTokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpServletRequest
    ) {
        return ResponseEntity.ok(authService.login(
                request,
                resolveClientIp(httpServletRequest),
                resolveUserAgent(httpServletRequest)
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthTokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            int commaIndex = forwardedFor.indexOf(',');
            String first = commaIndex >= 0 ? forwardedFor.substring(0, commaIndex) : forwardedFor;
            return first.trim();
        }
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr == null ? "" : remoteAddr;
    }

    private String resolveUserAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        return userAgent == null ? "" : userAgent;
    }
}
