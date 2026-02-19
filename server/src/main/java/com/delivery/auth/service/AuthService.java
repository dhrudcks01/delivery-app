package com.delivery.auth.service;

import com.delivery.auth.dto.AuthTokenResponse;
import com.delivery.auth.dto.LoginRequest;
import com.delivery.auth.dto.RegisterRequest;
import com.delivery.auth.dto.RefreshTokenRequest;
import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.DuplicateEmailException;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.InvalidRefreshTokenException;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.auth.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final String LOCAL_PROVIDER = "LOCAL";
    private final UserRepository userRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(
            UserRepository userRepository,
            AuthIdentityRepository authIdentityRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.authIdentityRepository = authIdentityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
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
    public AuthTokenResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

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

    private AuthTokenResponse issueTokens(UserEntity user) {
        return new AuthTokenResponse(
                "Bearer",
                jwtTokenProvider.generateAccessToken(user),
                jwtTokenProvider.accessTokenExpirationSeconds(),
                jwtTokenProvider.generateRefreshToken(user),
                jwtTokenProvider.refreshTokenExpirationSeconds()
        );
    }
}
