package com.delivery.payment.service;

import com.delivery.notification.service.WasteRequestPaymentCompletedNotificationService;
import com.delivery.payment.entity.PaymentEntity;
import com.delivery.payment.entity.PaymentMethodEntity;
import com.delivery.payment.model.PaymentMethodType;
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
    private static final String STATUS_PENDING = "PENDING";
    private static final String PROVIDER_TOSS = "TOSS";

    private final PaymentRepository paymentRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final WasteStatusTransitionService wasteStatusTransitionService;
    private final WasteRequestPaymentCompletedNotificationService wasteRequestPaymentCompletedNotificationService;

    public PaymentAutomationService(
            PaymentRepository paymentRepository,
            PaymentMethodRepository paymentMethodRepository,
            WasteStatusTransitionService wasteStatusTransitionService,
            WasteRequestPaymentCompletedNotificationService wasteRequestPaymentCompletedNotificationService
    ) {
        this.paymentRepository = paymentRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.wasteStatusTransitionService = wasteStatusTransitionService;
        this.wasteRequestPaymentCompletedNotificationService = wasteRequestPaymentCompletedNotificationService;
    }

    @Transactional
    public void attemptAutoPaymentAfterMeasured(WasteRequestEntity request, String actorEmail) {
        if (paymentRepository.findByWasteRequestId(request.getId()).isPresent()) {
            return;
        }

        wasteStatusTransitionService.transition(request.getId(), STATUS_PAYMENT_PENDING, actorEmail);

        PaymentMethodEntity paymentMethod = paymentMethodRepository
                .findFirstByUserAndStatusAndMethodTypeOrderByCreatedAtDesc(
                        request.getUser(),
                        STATUS_ACTIVE,
                        PaymentMethodType.CARD.name()
                )
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
            return;
        }

        payment.markSuccess("mock_payment_key_" + UUID.randomUUID());
        wasteStatusTransitionService.transition(request.getId(), STATUS_PAID, actorEmail);
        WasteRequestEntity completed = wasteStatusTransitionService.transition(request.getId(), STATUS_COMPLETED, actorEmail);
        wasteRequestPaymentCompletedNotificationService.notifyPaymentCompleted(completed);
    }

    private String createProviderOrderId(Long requestId) {
        return "ORDER-WR-" + requestId + "-" + UUID.randomUUID().toString().replace("-", "");
    }
}

