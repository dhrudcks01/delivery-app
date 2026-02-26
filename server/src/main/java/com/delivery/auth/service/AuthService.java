package com.delivery.auth.service;

import com.delivery.auth.dto.AuthTokenResponse;
import com.delivery.auth.dto.LoginRequest;
import com.delivery.auth.dto.MeResponse;
import com.delivery.auth.dto.RegisterRequest;
import com.delivery.auth.dto.RefreshTokenRequest;
import com.delivery.auth.dto.UpdateProfileRequest;
import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.DuplicateEmailException;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.InvalidRefreshTokenException;
import com.delivery.auth.exception.LoginIdentifierNotFoundException;
import com.delivery.auth.exception.LoginPasswordMismatchException;
import com.delivery.auth.exception.PhoneNumberUpdateNotAllowedException;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.auth.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class AuthService {

    private static final String LOCAL_PROVIDER = "LOCAL";
    private final UserRepository userRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final LoginAuditLogService loginAuditLogService;

    public AuthService(
            UserRepository userRepository,
            AuthIdentityRepository authIdentityRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            LoginAuditLogService loginAuditLogService
    ) {
        this.userRepository = userRepository;
        this.authIdentityRepository = authIdentityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.loginAuditLogService = loginAuditLogService;
    }

    @Transactional
    public AuthTokenResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException();
        }

        UserEntity user = new UserEntity(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.displayName(),
                "ACTIVE"
        );
        UserEntity saved = userRepository.save(user);
        authIdentityRepository.save(new AuthIdentityEntity(saved, LOCAL_PROVIDER, request.email()));
        return issueTokens(saved);
    }

    @Transactional
    public AuthTokenResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String identifier = request.email().trim();
        UserEntity user = userRepository.findByEmail(identifier)
                .orElseThrow(() -> {
                    loginAuditLogService.record(identifier, ipAddress, userAgent, "IDENTIFIER_NOT_FOUND");
                    return new LoginIdentifierNotFoundException();
                });

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAuditLogService.record(identifier, ipAddress, userAgent, "PASSWORD_MISMATCH");
            throw new LoginPasswordMismatchException();
        }

        loginAuditLogService.record(identifier, ipAddress, userAgent, "SUCCESS");
        return issueTokens(user);
    }

    @Transactional
    public AuthTokenResponse refresh(RefreshTokenRequest request) {
        Claims claims;
        try {
            claims = jwtTokenProvider.parseClaims(request.refreshToken());
        } catch (JwtException exception) {
            throw new InvalidRefreshTokenException();
        }

        Object tokenType = claims.get("type");
        if (!"refresh".equals(tokenType)) {
            throw new InvalidRefreshTokenException();
        }

        String email = claims.getSubject();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(InvalidRefreshTokenException::new);

        return issueTokens(user);
    }

    @Transactional
    public MeResponse getMe(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
        List<String> roles = userRepository.findRoleCodesByEmail(email);
        return toMeResponse(user, roles);
    }

    @Transactional
    public MeResponse updateProfile(String email, UpdateProfileRequest request) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (StringUtils.hasText(request.phoneNumber())) {
            throw new PhoneNumberUpdateNotAllowedException();
        }

        if (StringUtils.hasText(request.displayName())) {
            user.changeDisplayName(request.displayName().trim());
        }

        List<String> roles = userRepository.findRoleCodesByEmail(email);
        return toMeResponse(user, roles);
    }

    private AuthTokenResponse issueTokens(UserEntity user) {
        return new AuthTokenResponse(
                "Bearer",
                jwtTokenProvider.generateAccessToken(user),
                jwtTokenProvider.accessTokenExpirationSeconds(),
                jwtTokenProvider.generateRefreshToken(user),
                jwtTokenProvider.refreshTokenExpirationSeconds(),
                isPhoneVerificationRequired(user)
        );
    }

    private boolean isPhoneVerificationRequired(UserEntity user) {
        return user.getPhoneVerifiedAt() == null || !StringUtils.hasText(user.getPhoneE164());
    }

    private MeResponse toMeResponse(UserEntity user, List<String> roles) {
        return new MeResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                roles,
                maskPhoneNumber(user.getPhoneE164()),
                user.getPhoneVerifiedAt(),
                user.getPhoneVerificationProvider()
        );
    }

    private String maskPhoneNumber(String phoneE164) {
        if (!StringUtils.hasText(phoneE164)) {
            return null;
        }

        String digits = phoneE164.replaceAll("[^0-9]", "");
        if (!StringUtils.hasText(digits)) {
            return null;
        }

        String localDigits = digits;
        if (digits.startsWith("82") && digits.length() > 2) {
            localDigits = "0" + digits.substring(2);
        }

        if (localDigits.length() < 7) {
            return "****";
        }

        String prefix = localDigits.substring(0, Math.min(3, localDigits.length()));
        String suffix = localDigits.substring(localDigits.length() - 4);
        return prefix + "-****-" + suffix;
    }
}
