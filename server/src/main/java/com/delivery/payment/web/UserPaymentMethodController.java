package com.delivery.payment.web;

import com.delivery.payment.dto.PaymentMethodStatusResponse;
import com.delivery.payment.service.PaymentFailureHandlingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/payment-methods")
public class UserPaymentMethodController {

    private final PaymentFailureHandlingService paymentFailureHandlingService;

    public UserPaymentMethodController(PaymentFailureHandlingService paymentFailureHandlingService) {
        this.paymentFailureHandlingService = paymentFailureHandlingService;
    }

    @GetMapping
    public ResponseEntity<PaymentMethodStatusResponse> getMyPaymentMethods(Authentication authentication) {
        return ResponseEntity.ok(paymentFailureHandlingService.getPaymentMethodStatus(authentication.getName()));
    }
}
