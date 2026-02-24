package com.delivery.payment.web;

import com.delivery.payment.dto.PaymentMethodRegistrationFailResponse;
import com.delivery.payment.dto.PaymentMethodRegistrationStartResponse;
import com.delivery.payment.dto.PaymentMethodRegistrationSuccessResponse;
import com.delivery.payment.service.PaymentMethodRegistrationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/payment-methods/registration")
public class PaymentMethodRegistrationController {

    private final PaymentMethodRegistrationService paymentMethodRegistrationService;

    public PaymentMethodRegistrationController(PaymentMethodRegistrationService paymentMethodRegistrationService) {
        this.paymentMethodRegistrationService = paymentMethodRegistrationService;
    }

    @PostMapping("/start")
    public ResponseEntity<PaymentMethodRegistrationStartResponse> start(
            Authentication authentication,
            @RequestParam(required = false) String methodType
    ) {
        PaymentMethodRegistrationStartResponse response = paymentMethodRegistrationService
                .startRegistration(authentication.getName(), methodType);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/success")
    public ResponseEntity<PaymentMethodRegistrationSuccessResponse> success(
            Authentication authentication,
            @RequestParam String customerKey,
            @RequestParam String authKey,
            @RequestParam(required = false) String methodType
    ) {
        PaymentMethodRegistrationSuccessResponse response = paymentMethodRegistrationService.registerSuccess(
                authentication.getName(),
                customerKey,
                authKey,
                methodType
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/fail")
    public ResponseEntity<PaymentMethodRegistrationFailResponse> fail(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String message
    ) {
        return ResponseEntity.ok(paymentMethodRegistrationService.registerFail(code, message));
    }
}
