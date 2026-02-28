package com.delivery.waste.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.entity.WasteStatusLogEntity;
import com.delivery.waste.exception.WasteRequestNotFoundException;
import com.delivery.waste.exception.WasteStatusTransitionConflictException;
import com.delivery.waste.repository.WasteRequestRepository;
import com.delivery.waste.repository.WasteStatusLogRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
public class WasteStatusTransitionService {

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            "REQUESTED", Set.of("ASSIGNED", "CANCELED"),
            "ASSIGNED", Set.of("MEASURED"),
            "MEASURED", Set.of("PAYMENT_PENDING"),
            "PAYMENT_PENDING", Set.of("PAID", "PAYMENT_FAILED"),
            "PAID", Set.of("COMPLETED"),
            "PAYMENT_FAILED", Set.of("PAYMENT_PENDING")
    );

    private final WasteRequestRepository wasteRequestRepository;
    private final WasteStatusLogRepository wasteStatusLogRepository;
    private final UserRepository userRepository;

    public WasteStatusTransitionService(
            WasteRequestRepository wasteRequestRepository,
            WasteStatusLogRepository wasteStatusLogRepository,
            UserRepository userRepository
    ) {
        this.wasteRequestRepository = wasteRequestRepository;
        this.wasteStatusLogRepository = wasteStatusLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public WasteRequestEntity transition(Long requestId, String toStatus, String actorEmail) {
        WasteRequestEntity request = wasteRequestRepository.findById(requestId)
                .orElseThrow(WasteRequestNotFoundException::new);
        UserEntity actor = userRepository.findByLoginId(actorEmail)
                .orElseThrow(InvalidCredentialsException::new);
        return transitionInternal(request, toStatus, actor);
    }

    @Transactional
    public WasteRequestEntity transitionForOwner(Long requestId, String toStatus, String actorEmail) {
        UserEntity actor = userRepository.findByLoginId(actorEmail)
                .orElseThrow(InvalidCredentialsException::new);
        WasteRequestEntity request = wasteRequestRepository.findByIdAndUser(requestId, actor)
                .orElseThrow(WasteRequestNotFoundException::new);
        return transitionInternal(request, toStatus, actor);
    }

    private WasteRequestEntity transitionInternal(WasteRequestEntity request, String toStatus, UserEntity actor) {
        String fromStatus = request.getStatus();
        validateTransition(fromStatus, toStatus);

        request.changeStatus(toStatus);
        wasteStatusLogRepository.save(new WasteStatusLogEntity(
                request,
                fromStatus,
                toStatus,
                actor
        ));
        return request;
    }

    private void validateTransition(String fromStatus, String toStatus) {
        Set<String> nextStatuses = ALLOWED_TRANSITIONS.get(fromStatus);
        if (nextStatuses == null || !nextStatuses.contains(toStatus)) {
            throw new WasteStatusTransitionConflictException();
        }
    }
}
