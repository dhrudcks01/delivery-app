package com.delivery;

import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.entity.WasteStatusLogEntity;
import com.delivery.waste.exception.WasteStatusTransitionConflictException;
import com.delivery.waste.repository.WasteRequestRepository;
import com.delivery.waste.repository.WasteStatusLogRepository;
import com.delivery.waste.service.WasteStatusTransitionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class WasteStatusTransitionServiceIntegrationTest {

    @Autowired
    private WasteStatusTransitionService wasteStatusTransitionService;

    @Autowired
    private WasteRequestRepository wasteRequestRepository;

    @Autowired
    private WasteStatusLogRepository wasteStatusLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthIdentityRepository authIdentityRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void transitionUpdatesStatusAndWritesAuditLog() {
        UserEntity requester = createUser("waste-requester@example.com");
        UserEntity actor = createUser("waste-actor@example.com");

        WasteRequestEntity request = wasteRequestRepository.save(new WasteRequestEntity(
                requester,
                "서울시 강남구 테헤란로 1",
                "010-1234-5678",
                "문 앞에 두었습니다.",
                "REQUESTED",
                "KRW"
        ));

        wasteStatusTransitionService.transition(request.getId(), "ASSIGNED", actor.getEmail());

        WasteRequestEntity updated = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("ASSIGNED");

        List<WasteStatusLogEntity> logs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(updated);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getFromStatus()).isEqualTo("REQUESTED");
        assertThat(logs.get(0).getToStatus()).isEqualTo("ASSIGNED");
        assertThat(logs.get(0).getActorUser().getId()).isEqualTo(actor.getId());
    }

    @Test
    void invalidTransitionThrowsConflictAndDoesNotWriteLog() {
        UserEntity requester = createUser("waste-invalid-requester@example.com");
        UserEntity actor = createUser("waste-invalid-actor@example.com");

        WasteRequestEntity request = wasteRequestRepository.save(new WasteRequestEntity(
                requester,
                "서울시 송파구 올림픽로 100",
                "010-9999-8888",
                null,
                "REQUESTED",
                "KRW"
        ));

        assertThatThrownBy(() -> wasteStatusTransitionService.transition(
                request.getId(),
                "COMPLETED",
                actor.getEmail()
        )).isInstanceOf(WasteStatusTransitionConflictException.class);

        WasteRequestEntity unchanged = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo("REQUESTED");
        assertThat(wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(unchanged)).isEmpty();
    }

    @Test
    void requestedToAssignedToMeasuredToPaidFlowIsAllowed() {
        UserEntity requester = createUser("waste-paid-requester@example.com");
        UserEntity actor = createUser("waste-paid-actor@example.com");
        WasteRequestEntity request = createRequest(requester, "서울시 서초구 반포대로 10");

        wasteStatusTransitionService.transition(request.getId(), "ASSIGNED", actor.getEmail());
        wasteStatusTransitionService.transition(request.getId(), "MEASURED", actor.getEmail());
        wasteStatusTransitionService.transition(request.getId(), "PAYMENT_PENDING", actor.getEmail());
        wasteStatusTransitionService.transition(request.getId(), "PAID", actor.getEmail());

        WasteRequestEntity updated = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("PAID");

        List<WasteStatusLogEntity> logs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(updated);
        assertThat(logs).hasSize(4);
        assertThat(logs.get(0).getFromStatus()).isEqualTo("REQUESTED");
        assertThat(logs.get(0).getToStatus()).isEqualTo("ASSIGNED");
        assertThat(logs.get(1).getFromStatus()).isEqualTo("ASSIGNED");
        assertThat(logs.get(1).getToStatus()).isEqualTo("MEASURED");
        assertThat(logs.get(2).getFromStatus()).isEqualTo("MEASURED");
        assertThat(logs.get(2).getToStatus()).isEqualTo("PAYMENT_PENDING");
        assertThat(logs.get(3).getFromStatus()).isEqualTo("PAYMENT_PENDING");
        assertThat(logs.get(3).getToStatus()).isEqualTo("PAID");
    }

    @Test
    void requestedToAssignedToMeasuredToPaymentFailedFlowIsAllowed() {
        UserEntity requester = createUser("waste-failed-requester@example.com");
        UserEntity actor = createUser("waste-failed-actor@example.com");
        WasteRequestEntity request = createRequest(requester, "서울시 중랑구 사가정로 11");

        wasteStatusTransitionService.transition(request.getId(), "ASSIGNED", actor.getEmail());
        wasteStatusTransitionService.transition(request.getId(), "MEASURED", actor.getEmail());
        wasteStatusTransitionService.transition(request.getId(), "PAYMENT_PENDING", actor.getEmail());
        wasteStatusTransitionService.transition(request.getId(), "PAYMENT_FAILED", actor.getEmail());

        WasteRequestEntity updated = wasteRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("PAYMENT_FAILED");

        List<WasteStatusLogEntity> logs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(updated);
        assertThat(logs).hasSize(4);
        assertThat(logs.get(0).getFromStatus()).isEqualTo("REQUESTED");
        assertThat(logs.get(0).getToStatus()).isEqualTo("ASSIGNED");
        assertThat(logs.get(1).getFromStatus()).isEqualTo("ASSIGNED");
        assertThat(logs.get(1).getToStatus()).isEqualTo("MEASURED");
        assertThat(logs.get(2).getFromStatus()).isEqualTo("MEASURED");
        assertThat(logs.get(2).getToStatus()).isEqualTo("PAYMENT_PENDING");
        assertThat(logs.get(3).getFromStatus()).isEqualTo("PAYMENT_PENDING");
        assertThat(logs.get(3).getToStatus()).isEqualTo("PAYMENT_FAILED");
    }

    private WasteRequestEntity createRequest(UserEntity requester, String address) {
        return wasteRequestRepository.save(new WasteRequestEntity(
                requester,
                address,
                "010-2222-3333",
                null,
                "REQUESTED",
                "KRW"
        ));
    }

    private UserEntity createUser(String email) {
        UserEntity user = userRepository.save(new UserEntity(
                email,
                passwordEncoder.encode("password123"),
                "상태전이테스터",
                "ACTIVE"
        ));
        authIdentityRepository.save(new AuthIdentityEntity(user, "LOCAL", email));
        return user;
    }
}
