package com.delivery.auth.service;

import com.delivery.auth.config.PhoneVerificationProperties;
import com.delivery.auth.dto.PhoneVerificationCompleteResponse;
import com.delivery.auth.dto.PhoneVerificationStartResponse;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.entity.UserPhoneVerificationEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.PhoneVerificationException;
import com.delivery.auth.model.PhoneVerificationStatus;
import com.delivery.auth.repository.UserPhoneVerificationRepository;
import com.delivery.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class PhoneVerificationService {

    private static final Logger log = LoggerFactory.getLogger(PhoneVerificationService.class);

    private final UserRepository userRepository;
    private final UserPhoneVerificationRepository userPhoneVerificationRepository;
    private final PhoneVerificationProperties phoneVerificationProperties;
    private final PortOneIdentityVerificationClient portOneIdentityVerificationClient;

    public PhoneVerificationService(
            UserRepository userRepository,
            UserPhoneVerificationRepository userPhoneVerificationRepository,
            PhoneVerificationProperties phoneVerificationProperties,
            PortOneIdentityVerificationClient portOneIdentityVerificationClient
    ) {
        this.userRepository = userRepository;
        this.userPhoneVerificationRepository = userPhoneVerificationRepository;
        this.phoneVerificationProperties = phoneVerificationProperties;
        this.portOneIdentityVerificationClient = portOneIdentityVerificationClient;
    }

    @Transactional
    public PhoneVerificationStartResponse start(String email) {
        UserEntity user = userRepository.findByLoginId(email).orElseThrow(InvalidCredentialsException::new);
        log.info(
                "phoneVerification.start requested userId={} loginId={} provider={}",
                user.getId(),
                user.getLoginId(),
                phoneVerificationProperties.getProvider()
        );
        validateStartConfiguration();

        String identityVerificationId = generateIdentityVerificationId(user.getId());
        userPhoneVerificationRepository.save(new UserPhoneVerificationEntity(
                user,
                identityVerificationId,
                phoneVerificationProperties.getProvider(),
                null
        ));
        log.info(
                "phoneVerification.start created userId={} identityVerificationId={}",
                user.getId(),
                identityVerificationId
        );

        return new PhoneVerificationStartResponse(
                phoneVerificationProperties.getProvider(),
                phoneVerificationProperties.getStoreId(),
                phoneVerificationProperties.getChannelKey(),
                identityVerificationId
        );
    }

    @Transactional(rollbackOn = Exception.class, dontRollbackOn = PhoneVerificationException.class)
    public PhoneVerificationCompleteResponse complete(String email, String identityVerificationId) {
        UserEntity user = userRepository.findByLoginId(email).orElseThrow(InvalidCredentialsException::new);
        log.info(
                "phoneVerification.complete requested userId={} loginId={} identityVerificationId={}",
                user.getId(),
                user.getLoginId(),
                identityVerificationId
        );
        UserPhoneVerificationEntity verification = userPhoneVerificationRepository.findByIdentityVerificationId(identityVerificationId)
                .orElseThrow(() -> new PhoneVerificationException(
                        HttpStatus.NOT_FOUND,
                        "PHONE_VERIFICATION_NOT_FOUND",
                        "본인인증 요청을 찾을 수 없습니다."
                ));

        if (!verification.getUser().getId().equals(user.getId())) {
            throw new PhoneVerificationException(
                    HttpStatus.FORBIDDEN,
                    "PHONE_VERIFICATION_ACCESS_DENIED",
                    "본인인증 요청 접근 권한이 없습니다."
            );
        }

        if (verification.getStatus() == PhoneVerificationStatus.VERIFIED) {
            log.info(
                    "phoneVerification.complete idempotent userId={} identityVerificationId={} phoneNumber={}",
                    user.getId(),
                    identityVerificationId,
                    maskPhoneNumber(user.getPhoneE164())
            );
            return new PhoneVerificationCompleteResponse(
                    identityVerificationId,
                    PhoneVerificationStatus.VERIFIED.name(),
                    user.getPhoneE164(),
                    phoneVerificationProperties.getProvider(),
                    user.getPhoneVerifiedAt(),
                    true
            );
        }

        PortOneIdentityVerificationClient.PortOneIdentityVerificationResult result =
                portOneIdentityVerificationClient.getIdentityVerification(identityVerificationId);
        log.info(
                "phoneVerification.complete providerResult userId={} identityVerificationId={} status={} failureCode={}",
                user.getId(),
                identityVerificationId,
                result.status(),
                result.failureCode()
        );

        return switch (result.status()) {
            case "VERIFIED" -> completeVerified(user, verification, identityVerificationId, result);
            case "FAILED" -> handleFailedStatus(verification, result);
            case "READY" -> throw new PhoneVerificationException(
                    HttpStatus.CONFLICT,
                    "PHONE_VERIFICATION_NOT_COMPLETED",
                    "본인인증이 아직 완료되지 않았습니다."
            );
            default -> throw new PhoneVerificationException(
                    HttpStatus.BAD_GATEWAY,
                    "PHONE_VERIFICATION_UNAVAILABLE",
                    "알 수 없는 본인인증 상태입니다."
            );
        };
    }

    private PhoneVerificationCompleteResponse completeVerified(
            UserEntity user,
            UserPhoneVerificationEntity verification,
            String identityVerificationId,
            PortOneIdentityVerificationClient.PortOneIdentityVerificationResult result
    ) {
        Instant verifiedAt = result.verifiedAt() == null ? Instant.now() : result.verifiedAt();
        String normalizedPhone = normalizePhoneNumber(result.phoneNumber());
        byte[] ciBytes = toUtf8Bytes(result.ci());
        byte[] diBytes = toUtf8Bytes(result.di());

        verification.markVerified(normalizedPhone, ciBytes, diBytes, verifiedAt);
        user.markPhoneVerified(
                normalizedPhone,
                verifiedAt,
                phoneVerificationProperties.getProvider(),
                identityVerificationId,
                ciBytes,
                diBytes
        );
        log.info(
                "phoneVerification.complete verified userId={} identityVerificationId={} phoneNumber={} verifiedAt={}",
                user.getId(),
                identityVerificationId,
                maskPhoneNumber(normalizedPhone),
                verifiedAt
        );

        return new PhoneVerificationCompleteResponse(
                identityVerificationId,
                PhoneVerificationStatus.VERIFIED.name(),
                normalizedPhone,
                phoneVerificationProperties.getProvider(),
                verifiedAt,
                false
        );
    }

    private PhoneVerificationCompleteResponse handleFailedStatus(
            UserPhoneVerificationEntity verification,
            PortOneIdentityVerificationClient.PortOneIdentityVerificationResult result
    ) {
        String failureCode = StringUtils.hasText(result.failureCode())
                ? result.failureCode().trim()
                : "UNKNOWN";
        String failureMessage = StringUtils.hasText(result.failureMessage())
                ? result.failureMessage().trim()
                : "본인인증에 실패했습니다.";

        if (isCanceledCode(failureCode)) {
            verification.cancel();
            log.warn(
                    "phoneVerification.complete canceled identityVerificationId={} failureCode={} failureMessage={}",
                    verification.getIdentityVerificationId(),
                    failureCode,
                    failureMessage
            );
            throw new PhoneVerificationException(
                    HttpStatus.CONFLICT,
                    "PHONE_VERIFICATION_CANCELED",
                    "본인인증이 취소되었습니다."
            );
        }

        verification.markFailed(failureCode, failureMessage);
        log.warn(
                "phoneVerification.complete failed identityVerificationId={} failureCode={} failureMessage={}",
                verification.getIdentityVerificationId(),
                failureCode,
                failureMessage
        );
        throw new PhoneVerificationException(
                HttpStatus.CONFLICT,
                "PHONE_VERIFICATION_FAILED",
                "본인인증이 실패했습니다. code=%s".formatted(failureCode)
        );
    }

    private void validateStartConfiguration() {
        if (!StringUtils.hasText(phoneVerificationProperties.getStoreId())
                || !StringUtils.hasText(phoneVerificationProperties.getChannelKey())) {
            log.error(
                    "phoneVerification.start configuration missing provider={} storeIdPresent={} channelKeyPresent={}",
                    phoneVerificationProperties.getProvider(),
                    StringUtils.hasText(phoneVerificationProperties.getStoreId()),
                    StringUtils.hasText(phoneVerificationProperties.getChannelKey())
            );
            throw new PhoneVerificationException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "PHONE_VERIFICATION_CONFIGURATION_ERROR",
                    "휴대폰 본인인증 설정이 누락되었습니다."
            );
        }
    }

    private String generateIdentityVerificationId(Long userId) {
        return "identity-verification-" + userId + "-" + UUID.randomUUID().toString().replace("-", "");
    }

    private String normalizePhoneNumber(String rawPhoneNumber) {
        if (!StringUtils.hasText(rawPhoneNumber)) {
            return null;
        }

        String trimmed = rawPhoneNumber.trim();
        boolean hasPlusPrefix = trimmed.startsWith("+");
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (!StringUtils.hasText(digits)) {
            return null;
        }

        if (hasPlusPrefix || digits.startsWith("82")) {
            return "+" + digits;
        }
        if (digits.startsWith("0")) {
            return "+82" + digits.substring(1);
        }
        return "+" + digits;
    }

    private byte[] toUtf8Bytes(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.getBytes(StandardCharsets.UTF_8);
    }

    private boolean isCanceledCode(String code) {
        String normalized = code.toUpperCase(Locale.ROOT);
        return normalized.contains("CANCEL");
    }

    private String maskPhoneNumber(String phone) {
        if (!StringUtils.hasText(phone)) {
            return "";
        }
        String normalized = phone.trim();
        if (normalized.length() <= 7) {
            return "***";
        }
        return normalized.substring(0, 4) + "***" + normalized.substring(normalized.length() - 3);
    }
}
