package com.delivery.payment.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.payment.config.PaymentRegistrationProperties;
import com.delivery.payment.dto.PaymentMethodRegistrationFailResponse;
import com.delivery.payment.dto.PaymentMethodRegistrationStartResponse;
import com.delivery.payment.dto.PaymentMethodRegistrationSuccessResponse;
import com.delivery.payment.entity.PaymentMethodEntity;
import com.delivery.payment.exception.InvalidPaymentMethodRegistrationException;
import com.delivery.payment.model.PaymentMethodType;
import com.delivery.payment.repository.PaymentMethodRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PaymentMethodRegistrationService {

    private static final String PAYMENT_METHOD_ACTIVE = "ACTIVE";
    private static final Pattern CUSTOMER_KEY_PATTERN = Pattern.compile("^delivery_user_(\\d+)_([a-f0-9]{32})$");

    private final UserRepository userRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentFailureHandlingService paymentFailureHandlingService;
    private final PaymentRegistrationProperties paymentRegistrationProperties;

    public PaymentMethodRegistrationService(
            UserRepository userRepository,
            PaymentMethodRepository paymentMethodRepository,
            PaymentFailureHandlingService paymentFailureHandlingService,
            PaymentRegistrationProperties paymentRegistrationProperties
    ) {
        this.userRepository = userRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.paymentFailureHandlingService = paymentFailureHandlingService;
        this.paymentRegistrationProperties = paymentRegistrationProperties;
    }

    @Transactional
    public PaymentMethodRegistrationStartResponse startRegistration(String email, String rawMethodType) {
        UserEntity user = userRepository.findByLoginId(email).orElseThrow(InvalidCredentialsException::new);
        PaymentMethodType methodType = parseMethodType(rawMethodType);

        String customerKey = generateCustomerKey(user.getId());
        String successUrl = appendMethodType(paymentRegistrationProperties.getSuccessUrl(), methodType);
        String failUrl = appendMethodType(paymentRegistrationProperties.getFailUrl(), methodType);
        String registrationUrl = UriComponentsBuilder
                .fromHttpUrl(paymentRegistrationProperties.getBillingAuthBaseUrl())
                .queryParam("customerKey", customerKey)
                .queryParam("successUrl", successUrl)
                .queryParam("failUrl", failUrl)
                .build()
                .toUriString();
        return new PaymentMethodRegistrationStartResponse(customerKey, registrationUrl, methodType.name());
    }

    @Transactional
    public PaymentMethodRegistrationSuccessResponse registerSuccess(
            String email,
            String customerKey,
            String authKey,
            String rawMethodType
    ) {
        if (authKey == null || authKey.isBlank()) {
            throw new InvalidPaymentMethodRegistrationException("authKey는 필수입니다.");
        }

        PaymentMethodType methodType = parseMethodType(rawMethodType);
        UserEntity user = userRepository.findByLoginId(email).orElseThrow(InvalidCredentialsException::new);
        validateCustomerKeyOwnership(customerKey, user.getId());
        paymentFailureHandlingService.deactivateActiveMethods(user);

        PaymentMethodEntity saved = paymentMethodRepository.save(new PaymentMethodEntity(
                user,
                methodType.providerCode(),
                methodType.name(),
                customerKey,
                authKey,
                PAYMENT_METHOD_ACTIVE
        ));

        return new PaymentMethodRegistrationSuccessResponse(
                saved.getId(),
                saved.getProvider(),
                saved.getMethodType(),
                saved.getStatus(),
                saved.getCreatedAt()
        );
    }

    public PaymentMethodRegistrationFailResponse registerFail(String code, String message) {
        String safeCode = (code == null || code.isBlank()) ? "UNKNOWN" : code;
        String safeMessage = (message == null || message.isBlank()) ? "결제수단 등록에 실패했습니다." : message;
        return new PaymentMethodRegistrationFailResponse(safeCode, safeMessage);
    }

    private String generateCustomerKey(Long userId) {
        String random = UUID.randomUUID().toString().replace("-", "").toLowerCase(Locale.ROOT);
        return "delivery_user_" + userId + "_" + random;
    }

    private void validateCustomerKeyOwnership(String customerKey, Long authenticatedUserId) {
        if (customerKey == null || customerKey.isBlank()) {
            throw new InvalidPaymentMethodRegistrationException("customerKey는 필수입니다.");
        }

        Matcher matcher = CUSTOMER_KEY_PATTERN.matcher(customerKey);
        if (!matcher.matches()) {
            throw new InvalidPaymentMethodRegistrationException("customerKey 형식이 올바르지 않습니다.");
        }

        Long customerKeyUserId = Long.parseLong(matcher.group(1));
        if (!customerKeyUserId.equals(authenticatedUserId)) {
            throw new InvalidPaymentMethodRegistrationException("customerKey 사용자 정보가 일치하지 않습니다.");
        }
    }

    private PaymentMethodType parseMethodType(String rawMethodType) {
        try {
            return PaymentMethodType.fromNullable(rawMethodType);
        } catch (IllegalArgumentException ex) {
            throw new InvalidPaymentMethodRegistrationException("지원하지 않는 결제수단 타입입니다.");
        }
    }

    private String appendMethodType(String baseUrl, PaymentMethodType methodType) {
        return UriComponentsBuilder
                .fromHttpUrl(baseUrl)
                .queryParam("methodType", methodType.name())
                .build()
                .toUriString();
    }
}
