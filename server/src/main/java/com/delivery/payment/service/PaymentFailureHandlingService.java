package com.delivery.payment.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.payment.dto.FailedPaymentResponse;
import com.delivery.payment.dto.PaymentMethodStatusResponse;
import com.delivery.payment.entity.PaymentEntity;
import com.delivery.payment.entity.PaymentMethodEntity;
import com.delivery.payment.exception.PaymentNotFoundException;
import com.delivery.payment.exception.PaymentRetryConflictException;
import com.delivery.payment.model.PaymentMethodType;
import com.delivery.payment.repository.PaymentMethodRepository;
import com.delivery.payment.repository.PaymentRepository;
import com.delivery.waste.dto.WasteRequestResponse;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.exception.WasteRequestNotFoundException;
import com.delivery.waste.repository.WasteRequestRepository;
import com.delivery.waste.service.WasteOrderNoPolicy;
import com.delivery.waste.service.WasteStatusTransitionService;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PaymentFailureHandlingService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_INACTIVE = "INACTIVE";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_PAYMENT_FAILED = "PAYMENT_FAILED";
    private static final String STATUS_PAYMENT_PENDING = "PAYMENT_PENDING";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String FAILURE_CODE_UNSUPPORTED_AUTO_PAYMENT_METHOD = "UNSUPPORTED_AUTO_PAYMENT_METHOD";
    private static final String FAILURE_MESSAGE_CARD_ONLY_AUTO_PAYMENT = "자동결제는 카드 직접 등록 수단만 지원합니다.";

    private final UserRepository userRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentRepository paymentRepository;
    private final WasteRequestRepository wasteRequestRepository;
    private final WasteStatusTransitionService wasteStatusTransitionService;

    public PaymentFailureHandlingService(
            UserRepository userRepository,
            PaymentMethodRepository paymentMethodRepository,
            PaymentRepository paymentRepository,
            WasteRequestRepository wasteRequestRepository,
            WasteStatusTransitionService wasteStatusTransitionService
    ) {
        this.userRepository = userRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.paymentRepository = paymentRepository;
        this.wasteRequestRepository = wasteRequestRepository;
        this.wasteStatusTransitionService = wasteStatusTransitionService;
    }

    @Transactional
    public PaymentMethodStatusResponse getPaymentMethodStatus(String email) {
        UserEntity user = userRepository.findByEmail(email).orElseThrow(InvalidCredentialsException::new);
        return new PaymentMethodStatusResponse(
                true,
                paymentMethodRepository.findAllByUserOrderByCreatedAtDesc(user).stream()
                        .map(method -> new PaymentMethodStatusResponse.PaymentMethodStatusItem(
                                method.getId(),
                                method.getProvider(),
                                method.getMethodType(),
                                method.getStatus(),
                                method.getCreatedAt(),
                                method.getUpdatedAt()
                        ))
                        .toList()
        );
    }

    @Transactional
    public void deactivateActiveMethods(UserEntity user) {
        paymentMethodRepository.findAllByUserAndStatusOrderByCreatedAtDesc(user, STATUS_ACTIVE)
                .forEach(method -> method.changeStatus(STATUS_INACTIVE));
    }

    @Transactional
    public Page<FailedPaymentResponse> getFailedPayments(Pageable pageable) {
        return paymentRepository.findAllByStatusOrderByUpdatedAtDesc(STATUS_FAILED, pageable)
                .map(payment -> new FailedPaymentResponse(
                        payment.getId(),
                        payment.getWasteRequest().getId(),
                        payment.getWasteRequest().getUser().getId(),
                        payment.getAmount(),
                        payment.getCurrency(),
                        payment.getFailureCode(),
                        payment.getFailureMessage(),
                        payment.getUpdatedAt()
                ));
    }

    @Transactional
    public WasteRequestResponse retryFailedPayment(Long wasteRequestId, String actorEmail) {
        WasteRequestEntity request = wasteRequestRepository.findById(wasteRequestId)
                .orElseThrow(WasteRequestNotFoundException::new);
        PaymentEntity payment = paymentRepository.findByWasteRequestId(wasteRequestId)
                .orElseThrow(PaymentNotFoundException::new);

        if (!STATUS_PAYMENT_FAILED.equals(request.getStatus()) || !STATUS_FAILED.equals(payment.getStatus())) {
            throw new PaymentRetryConflictException("현재 상태에서는 결제 재시도가 불가능합니다.");
        }

        wasteStatusTransitionService.transition(wasteRequestId, STATUS_PAYMENT_PENDING, actorEmail);

        PaymentMethodEntity paymentMethod = paymentMethodRepository
                .findFirstByUserAndStatusAndMethodTypeOrderByCreatedAtDesc(
                        request.getUser(),
                        STATUS_ACTIVE,
                        PaymentMethodType.CARD.name()
                )
                .orElse(null);

        payment.markPendingForRetry(paymentMethod);

        if (paymentMethod == null) {
            payment.markFailure(FAILURE_CODE_UNSUPPORTED_AUTO_PAYMENT_METHOD, FAILURE_MESSAGE_CARD_ONLY_AUTO_PAYMENT);
            WasteRequestEntity failed = wasteStatusTransitionService.transition(
                    wasteRequestId,
                    STATUS_PAYMENT_FAILED,
                    actorEmail
            );
            return toResponse(failed);
        }

        payment.markSuccess("mock_payment_key_retry_" + UUID.randomUUID());
        wasteStatusTransitionService.transition(wasteRequestId, STATUS_PAID, actorEmail);
        WasteRequestEntity completed = wasteStatusTransitionService.transition(
                wasteRequestId,
                STATUS_COMPLETED,
                actorEmail
        );
        return toResponse(completed);
    }

    private WasteRequestResponse toResponse(WasteRequestEntity request) {
        return new WasteRequestResponse(
                request.getId(),
                WasteOrderNoPolicy.resolve(request.getOrderNo(), request.getId()),
                request.getUser().getId(),
                request.getAddress(),
                request.getContactPhone(),
                request.getNote(),
                request.getDisposalItems(),
                request.getBagCount(),
                request.getStatus(),
                request.getMeasuredWeightKg(),
                request.getMeasuredAt(),
                request.getMeasuredByDriver() != null ? request.getMeasuredByDriver().getId() : null,
                request.getFinalAmount(),
                request.getCurrency(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}
