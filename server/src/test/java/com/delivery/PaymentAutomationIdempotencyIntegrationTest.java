package com.delivery;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.UserRepository;
import com.delivery.payment.entity.PaymentMethodEntity;
import com.delivery.payment.repository.PaymentMethodRepository;
import com.delivery.payment.repository.PaymentRepository;
import com.delivery.payment.service.PaymentAutomationService;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.entity.WasteStatusLogEntity;
import com.delivery.waste.repository.WasteRequestRepository;
import com.delivery.waste.repository.WasteStatusLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class PaymentAutomationIdempotencyIntegrationTest {

    @Autowired
    private PaymentAutomationService paymentAutomationService;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentMethodRepository paymentMethodRepository;

    @Autowired
    private WasteRequestRepository wasteRequestRepository;

    @Autowired
    private WasteStatusLogRepository wasteStatusLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void autoPaymentIsIdempotentWhenCalledTwiceAfterMeasuredWithActivePaymentMethod() {
        UserEntity requester = createUser("idempotency-payment-user@example.com");
        UserEntity actor = createUser("idempotency-payment-actor@example.com");
        createActivePaymentMethod(requester);
        WasteRequestEntity request = createMeasuredRequest(requester);

        paymentAutomationService.attemptAutoPaymentAfterMeasured(request, actor.getEmail());
        List<WasteStatusLogEntity> firstLogs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(request);
        long firstPaymentCount = countPaymentsByWasteRequestId(request.getId());

        paymentAutomationService.attemptAutoPaymentAfterMeasured(request, actor.getEmail());
        List<WasteStatusLogEntity> secondLogs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(request);
        long secondPaymentCount = countPaymentsByWasteRequestId(request.getId());

        WasteRequestEntity updated = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("COMPLETED");
        assertThat(paymentRepository.findByWasteRequestId(request.getId())).isPresent();
        assertThat(paymentRepository.findByWasteRequestId(request.getId()).orElseThrow().getStatus())
                .isEqualTo("SUCCEEDED");
        assertThat(firstPaymentCount).isEqualTo(1L);
        assertThat(secondPaymentCount).isEqualTo(1L);
        assertThat(firstLogs).hasSize(3);
        assertThat(secondLogs).hasSize(3);
    }

    @Test
    void autoPaymentIsIdempotentWhenCalledTwiceAfterMeasuredWithoutActivePaymentMethod() {
        UserEntity requester = createUser("idempotency-failed-user@example.com");
        UserEntity actor = createUser("idempotency-failed-actor@example.com");
        WasteRequestEntity request = createMeasuredRequest(requester);

        paymentAutomationService.attemptAutoPaymentAfterMeasured(request, actor.getEmail());
        List<WasteStatusLogEntity> firstLogs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(request);
        long firstPaymentCount = countPaymentsByWasteRequestId(request.getId());

        paymentAutomationService.attemptAutoPaymentAfterMeasured(request, actor.getEmail());
        List<WasteStatusLogEntity> secondLogs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(request);
        long secondPaymentCount = countPaymentsByWasteRequestId(request.getId());

        WasteRequestEntity updated = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("PAYMENT_FAILED");
        assertThat(paymentRepository.findByWasteRequestId(request.getId())).isPresent();
        assertThat(paymentRepository.findByWasteRequestId(request.getId()).orElseThrow().getStatus())
                .isEqualTo("FAILED");
        assertThat(firstPaymentCount).isEqualTo(1L);
        assertThat(secondPaymentCount).isEqualTo(1L);
        assertThat(firstLogs).hasSize(2);
        assertThat(secondLogs).hasSize(2);
    }

    private UserEntity createUser(String email) {
        return userRepository.save(new UserEntity(
                email,
                "not-used-in-this-test",
                "결제멱등테스터",
                "ACTIVE"
        ));
    }

    private void createActivePaymentMethod(UserEntity user) {
        paymentMethodRepository.save(new PaymentMethodEntity(
                user,
                "TOSS",
                "delivery_user_" + user.getId() + "_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "billing-token-idempotency",
                "ACTIVE"
        ));
    }

    private WasteRequestEntity createMeasuredRequest(UserEntity requester) {
        WasteRequestEntity request = new WasteRequestEntity(
                requester,
                "서울시 강남구 결제테스트로 1",
                "010-3000-4000",
                null,
                "MEASURED",
                "KRW"
        );
        request.updateFinalAmount(4500L);
        return wasteRequestRepository.save(request);
    }

    private long countPaymentsByWasteRequestId(Long wasteRequestId) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE waste_request_id = ?",
                Long.class,
                wasteRequestId
        );
        return count != null ? count : 0L;
    }
}
