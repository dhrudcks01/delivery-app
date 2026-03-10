package com.delivery.payment.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.notification.service.WasteRequestPaymentCompletedNotificationService;
import com.delivery.payment.dto.FailedPaymentResponse;
import com.delivery.payment.dto.PaymentMethodStatusResponse;
import com.delivery.payment.dto.PendingPaymentBatchExecuteRequest;
import com.delivery.payment.dto.PendingPaymentBatchExecuteResponse;
import com.delivery.payment.dto.PendingPaymentResponse;
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

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class PaymentFailureHandlingService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_INACTIVE = "INACTIVE";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_PAYMENT_FAILED = "PAYMENT_FAILED";
    private static final String STATUS_PAYMENT_PENDING = "PAYMENT_PENDING";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String FAILURE_CODE_UNSUPPORTED_AUTO_PAYMENT_METHOD = "UNSUPPORTED_AUTO_PAYMENT_METHOD";
    private static final String FAILURE_MESSAGE_CARD_ONLY_AUTO_PAYMENT = "\uC790\uB3D9\uACB0\uC81C\uB294 \uCE74\uB4DC \uB4F1\uB85D \uD6C4\uC5D0\uB9CC \uC9C4\uD589\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
    private static final String RESULT_SUCCEEDED = "SUCCEEDED";
    private static final String RESULT_FAILED = "FAILED";
    private static final String RESULT_SKIPPED = "SKIPPED";

    private final UserRepository userRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentRepository paymentRepository;
    private final WasteRequestRepository wasteRequestRepository;
    private final WasteStatusTransitionService wasteStatusTransitionService;
    private final WasteRequestPaymentCompletedNotificationService wasteRequestPaymentCompletedNotificationService;

    public PaymentFailureHandlingService(
            UserRepository userRepository,
            PaymentMethodRepository paymentMethodRepository,
            PaymentRepository paymentRepository,
            WasteRequestRepository wasteRequestRepository,
            WasteStatusTransitionService wasteStatusTransitionService,
            WasteRequestPaymentCompletedNotificationService wasteRequestPaymentCompletedNotificationService
    ) {
        this.userRepository = userRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.paymentRepository = paymentRepository;
        this.wasteRequestRepository = wasteRequestRepository;
        this.wasteStatusTransitionService = wasteStatusTransitionService;
        this.wasteRequestPaymentCompletedNotificationService = wasteRequestPaymentCompletedNotificationService;
    }

    @Transactional
    public PaymentMethodStatusResponse getPaymentMethodStatus(String loginId) {
        UserEntity user = userRepository.findByLoginId(loginId).orElseThrow(InvalidCredentialsException::new);
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
    public Page<PendingPaymentResponse> getPendingPayments(Pageable pageable) {
        return paymentRepository.findAllByStatusOrderByUpdatedAtDesc(STATUS_PENDING, pageable)
                .map(payment -> new PendingPaymentResponse(
                        payment.getId(),
                        payment.getWasteRequest().getId(),
                        payment.getWasteRequest().getUser().getId(),
                        payment.getAmount(),
                        payment.getCurrency(),
                        payment.getUpdatedAt()
                ));
    }

    @Transactional
    public PendingPaymentBatchExecuteResponse executePendingPaymentsBatch(
            PendingPaymentBatchExecuteRequest batchRequest,
            String actorLoginId
    ) {
        List<PaymentEntity> targets = resolvePendingTargets(batchRequest);
        List<PendingPaymentBatchExecuteResponse.Item> results = new ArrayList<>();

        int succeededCount = 0;
        int failedCount = 0;
        int skippedCount = 0;

        for (PaymentEntity payment : targets) {
            WasteRequestEntity request = payment.getWasteRequest();

            if (!STATUS_PENDING.equals(payment.getStatus()) || !STATUS_PAYMENT_PENDING.equals(request.getStatus())) {
                skippedCount += 1;
                results.add(new PendingPaymentBatchExecuteResponse.Item(
                        request.getId(),
                        payment.getId(),
                        RESULT_SKIPPED,
                        request.getStatus(),
                        payment.getStatus(),
                        "PENDING \uC0C1\uD0DC \uB300\uC0C1\uC774 \uC544\uB2D9\uB2C8\uB2E4."
                ));
                continue;
            }

            WasteRequestEntity executed = executePendingPayment(request, payment, actorLoginId);
            String result = STATUS_COMPLETED.equals(executed.getStatus()) ? RESULT_SUCCEEDED : RESULT_FAILED;

            if (RESULT_SUCCEEDED.equals(result)) {
                succeededCount += 1;
            } else {
                failedCount += 1;
            }

            results.add(new PendingPaymentBatchExecuteResponse.Item(
                    executed.getId(),
                    payment.getId(),
                    result,
                    executed.getStatus(),
                    payment.getStatus(),
                    null
            ));
        }

        return new PendingPaymentBatchExecuteResponse(
                targets.size(),
                succeededCount,
                failedCount,
                skippedCount,
                results
        );
    }

    @Transactional
    public WasteRequestResponse retryFailedPayment(Long wasteRequestId, String actorLoginId) {
        WasteRequestEntity request = wasteRequestRepository.findById(wasteRequestId)
                .orElseThrow(WasteRequestNotFoundException::new);
        PaymentEntity payment = paymentRepository.findByWasteRequestId(wasteRequestId)
                .orElseThrow(PaymentNotFoundException::new);

        if (!STATUS_PAYMENT_FAILED.equals(request.getStatus()) || !STATUS_FAILED.equals(payment.getStatus())) {
            throw new PaymentRetryConflictException(
                    "\uD604\uC7AC \uC0C1\uD0DC\uC5D0\uC11C\uB294 \uACB0\uC81C \uC7AC\uC2DC\uB3C4\uAC00 \uBD88\uAC00\uB2A5\uD569\uB2C8\uB2E4."
            );
        }

        WasteRequestEntity pending = wasteStatusTransitionService.transition(
                wasteRequestId,
                STATUS_PAYMENT_PENDING,
                actorLoginId
        );

        WasteRequestEntity executed = executePendingPayment(pending, payment, actorLoginId);
        return toResponse(executed);
    }

    private List<PaymentEntity> resolvePendingTargets(PendingPaymentBatchExecuteRequest batchRequest) {
        if (batchRequest == null || batchRequest.wasteRequestIds() == null || batchRequest.wasteRequestIds().isEmpty()) {
            return paymentRepository.findAllByStatusOrderByUpdatedAtAsc(STATUS_PENDING);
        }

        Set<Long> uniqueIds = new LinkedHashSet<>(batchRequest.wasteRequestIds());
        return paymentRepository.findAllByStatusAndWasteRequestIdIn(STATUS_PENDING, uniqueIds)
                .stream()
                .sorted(Comparator.comparing(PaymentEntity::getUpdatedAt))
                .toList();
    }

    private WasteRequestEntity executePendingPayment(
            WasteRequestEntity request,
            PaymentEntity payment,
            String actorLoginId
    ) {
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
            return wasteStatusTransitionService.transition(
                    request.getId(),
                    STATUS_PAYMENT_FAILED,
                    actorLoginId
            );
        }

        payment.markSuccess("mock_payment_key_retry_" + UUID.randomUUID());
        wasteStatusTransitionService.transition(request.getId(), STATUS_PAID, actorLoginId);
        WasteRequestEntity completed = wasteStatusTransitionService.transition(
                request.getId(),
                STATUS_COMPLETED,
                actorLoginId
        );
        wasteRequestPaymentCompletedNotificationService.notifyPaymentCompleted(completed);
        return completed;
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
