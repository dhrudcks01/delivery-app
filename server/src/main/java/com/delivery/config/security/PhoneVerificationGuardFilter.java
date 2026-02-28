package com.delivery.config.security;

import com.delivery.auth.config.PhoneVerificationProperties;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.UserRepository;
import com.delivery.web.error.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class PhoneVerificationGuardFilter extends OncePerRequestFilter {

    private static final String ERROR_CODE = "PHONE_VERIFICATION_REQUIRED";
    private static final String ERROR_MESSAGE = "휴대폰 본인인증이 필요합니다.";

    private static final List<String> PROTECTED_PATTERNS = List.of(
            "/user/**",
            "/driver/**",
            "/ops-admin/**",
            "/sys-admin/**",
            "/uploads",
            "/uploads/**"
    );

    private static final List<String> ALLOWED_PATTERNS = List.of(
            "/user/phone-verifications/**",
            "/me"
    );

    private final UserRepository userRepository;
    private final PhoneVerificationProperties phoneVerificationProperties;
    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public PhoneVerificationGuardFilter(
            UserRepository userRepository,
            PhoneVerificationProperties phoneVerificationProperties,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.phoneVerificationProperties = phoneVerificationProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!phoneVerificationProperties.isEnforcementEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String requestPath = request.getRequestURI();
        if (!isProtectedPath(requestPath) || isAllowedPath(requestPath)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            filterChain.doFilter(request, response);
            return;
        }

        String loginId = authentication.getName();
        UserEntity user = userRepository.findByLoginId(loginId).orElse(null);
        if (user == null || isVerified(user)) {
            filterChain.doFilter(request, response);
            return;
        }

        ApiErrorResponse error = ApiErrorResponse.of(
                HttpStatus.FORBIDDEN.value(),
                ERROR_CODE,
                ERROR_MESSAGE,
                requestPath
        );
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }

    private boolean isProtectedPath(String requestPath) {
        return PROTECTED_PATTERNS.stream().anyMatch(pattern -> pathMatcher.match(pattern, requestPath));
    }

    private boolean isAllowedPath(String requestPath) {
        return ALLOWED_PATTERNS.stream().anyMatch(pattern -> pathMatcher.match(pattern, requestPath));
    }

    private boolean isVerified(UserEntity user) {
        return user.getPhoneVerifiedAt() != null && StringUtils.hasText(user.getPhoneE164());
    }
}
