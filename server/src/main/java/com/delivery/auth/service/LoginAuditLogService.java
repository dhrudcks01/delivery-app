package com.delivery.auth.service;

import com.delivery.auth.dto.LoginAuditLogResponse;
import com.delivery.auth.entity.LoginAuditLogEntity;
import com.delivery.auth.repository.LoginAuditLogRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class LoginAuditLogService {

    private static final int IDENTIFIER_MAX_LENGTH = 255;
    private static final int IP_ADDRESS_MAX_LENGTH = 64;
    private static final int USER_AGENT_MAX_LENGTH = 500;

    private final LoginAuditLogRepository loginAuditLogRepository;

    public LoginAuditLogService(LoginAuditLogRepository loginAuditLogRepository) {
        this.loginAuditLogRepository = loginAuditLogRepository;
    }

    @Transactional
    public void record(String loginIdentifier, String ipAddress, String userAgent, String result) {
        loginAuditLogRepository.save(new LoginAuditLogEntity(
                trimToMax(loginIdentifier, IDENTIFIER_MAX_LENGTH),
                trimToMax(ipAddress, IP_ADDRESS_MAX_LENGTH),
                trimToMax(userAgent, USER_AGENT_MAX_LENGTH),
                result
        ));
    }

    @Transactional
    public Page<LoginAuditLogResponse> getLogs(String identifier, String result, Pageable pageable) {
        String normalizedIdentifier = normalizeIdentifier(identifier);
        String normalizedResult = normalizeResult(result);

        Page<LoginAuditLogEntity> page;
        if (normalizedIdentifier == null && normalizedResult == null) {
            page = loginAuditLogRepository.findAll(pageable);
        } else if (normalizedIdentifier == null) {
            page = loginAuditLogRepository.findAllByResult(normalizedResult, pageable);
        } else if (normalizedResult == null) {
            page = loginAuditLogRepository.findAllByLoginIdentifierContainingIgnoreCase(normalizedIdentifier, pageable);
        } else {
            page = loginAuditLogRepository.findAllByLoginIdentifierContainingIgnoreCaseAndResult(
                    normalizedIdentifier,
                    normalizedResult,
                    pageable
            );
        }
        return page.map(this::toResponse);
    }

    private String normalizeIdentifier(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed;
    }

    private String normalizeResult(String value) {
        String identifier = normalizeIdentifier(value);
        if (identifier == null) {
            return null;
        }
        return identifier.toUpperCase();
    }

    private String trimToMax(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength);
    }

    private LoginAuditLogResponse toResponse(LoginAuditLogEntity entity) {
        return new LoginAuditLogResponse(
                entity.getId(),
                entity.getLoginIdentifier(),
                entity.getIpAddress(),
                entity.getUserAgent(),
                entity.getResult(),
                entity.getCreatedAt()
        );
    }
}
