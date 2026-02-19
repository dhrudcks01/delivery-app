package com.delivery.waste.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.waste.dto.DriverAssignedWasteRequestResponse;
import com.delivery.waste.entity.WasteAssignmentEntity;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.exception.WasteRequestNotFoundException;
import com.delivery.waste.repository.WasteAssignmentRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DriverWasteRequestService {

    private final UserRepository userRepository;
    private final WasteAssignmentRepository wasteAssignmentRepository;

    public DriverWasteRequestService(
            UserRepository userRepository,
            WasteAssignmentRepository wasteAssignmentRepository
    ) {
        this.userRepository = userRepository;
        this.wasteAssignmentRepository = wasteAssignmentRepository;
    }

    @Transactional
    public List<DriverAssignedWasteRequestResponse> getMyAssignedRequests(String email) {
        UserEntity driver = findUserByEmail(email);
        return wasteAssignmentRepository.findAllByDriverOrderByAssignedAtDesc(driver)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DriverAssignedWasteRequestResponse getMyAssignedRequest(String email, Long requestId) {
        UserEntity driver = findUserByEmail(email);
        WasteAssignmentEntity assignment = wasteAssignmentRepository.findByRequestIdAndDriver(requestId, driver)
                .orElseThrow(WasteRequestNotFoundException::new);
        return toResponse(assignment);
    }

    private UserEntity findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private DriverAssignedWasteRequestResponse toResponse(WasteAssignmentEntity assignment) {
        WasteRequestEntity request = assignment.getRequest();
        return new DriverAssignedWasteRequestResponse(
                request.getId(),
                request.getStatus(),
                request.getAddress(),
                request.getContactPhone(),
                request.getNote(),
                assignment.getAssignedAt(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}
