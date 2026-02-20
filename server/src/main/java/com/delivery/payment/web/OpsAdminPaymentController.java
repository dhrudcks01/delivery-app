package com.delivery.payment.web;

import com.delivery.payment.dto.FailedPaymentResponse;
import com.delivery.payment.service.PaymentFailureHandlingService;
import com.delivery.waste.dto.WasteRequestResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ops-admin/payments")
public class OpsAdminPaymentController {

    private final PaymentFailureHandlingService paymentFailureHandlingService;

    public OpsAdminPaymentController(PaymentFailureHandlingService paymentFailureHandlingService) {
        this.paymentFailureHandlingService = paymentFailureHandlingService;
    }

    @GetMapping("/failed")
    public ResponseEntity<Page<FailedPaymentResponse>> getFailedPayments(
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(paymentFailureHandlingService.getFailedPayments(pageable));
    }

    @PostMapping("/waste-requests/{wasteRequestId}/retry")
    public ResponseEntity<WasteRequestResponse> retryFailedPayment(
            Authentication authentication,
            @PathVariable Long wasteRequestId
    ) {
        return ResponseEntity.ok(paymentFailureHandlingService.retryFailedPayment(
                wasteRequestId,
                authentication.getName()
        ));
    }
}
