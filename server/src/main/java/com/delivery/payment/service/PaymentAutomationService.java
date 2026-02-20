package com.delivery.payment.service;

import com.delivery.payment.entity.PaymentEntity;
import com.delivery.payment.entity.PaymentMethodEntity;
import com.delivery.payment.repository.PaymentMethodRepository;
import com.delivery.payment.repository.PaymentRepository;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.service.WasteStatusTransitionService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PaymentAutomationService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_PAYMENT_PENDING = "PAYMENT_PENDING";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_PAYMENT_FAILED = "PAYMENT_FAILED";
    private static final String STATUS_PENDING = "PENDING";
    private static final String PROVIDER_TOSS = "TOSS";

    private final PaymentRepository paymentRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final WasteStatusTransitionService wasteStatusTransitionService;

    public PaymentAutomationService(
            PaymentRepository paymentRepository,
            PaymentMethodRepository paymentMethodRepository,
            WasteStatusTransitionService wasteStatusTransitionService
    ) {
        this.paymentRepository = paymentRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.wasteStatusTransitionService = wasteStatusTransitionService;
    }

    @Transactional
    public void attemptAutoPaymentAfterMeasured(WasteRequestEntity request, String actorEmail) {
        if (paymentRepository.findByWasteRequestId(request.getId()).isPresent()) {
            return;
        }

        wasteStatusTransitionService.transition(request.getId(), STATUS_PAYMENT_PENDING, actorEmail);

        PaymentMethodEntity paymentMethod = paymentMethodRepository
                .findFirstByUserAndStatusOrderByCreatedAtDesc(request.getUser(), STATUS_ACTIVE)
                .orElse(null);

        PaymentEntity payment = new PaymentEntity(
                request,
                paymentMethod,
                PROVIDER_TOSS,
                createProviderOrderId(request.getId()),
                STATUS_PENDING,
                request.getFinalAmount(),
                request.getCurrency()
        );
        paymentRepository.save(payment);

        if (paymentMethod == null) {
            payment.markFailure("NO_ACTIVE_PAYMENT_METHOD", "활성 결제수단이 없습니다.");
            wasteStatusTransitionService.transition(request.getId(), STATUS_PAYMENT_FAILED, actorEmail);
            return;
        }

        payment.markSuccess("mock_payment_key_" + UUID.randomUUID());
        wasteStatusTransitionService.transition(request.getId(), STATUS_PAID, actorEmail);
        wasteStatusTransitionService.transition(request.getId(), STATUS_COMPLETED, actorEmail);
    }

    private String createProviderOrderId(Long requestId) {
        return "ORDER-WR-" + requestId + "-" + UUID.randomUUID().toString().replace("-", "");
    }
}
