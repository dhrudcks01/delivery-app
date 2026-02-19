package com.delivery.waste.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.waste.dto.DriverAssignedWasteRequestResponse;
import com.delivery.waste.dto.MeasureWasteRequest;
import com.delivery.waste.dto.WasteRequestResponse;
import com.delivery.waste.entity.WasteAssignmentEntity;
import com.delivery.waste.entity.WastePhotoEntity;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.exception.WasteRequestNotFoundException;
import com.delivery.waste.repository.WasteAssignmentRepository;
import com.delivery.waste.repository.WastePhotoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class DriverWasteRequestService {

    private static final String MEASURED = "MEASURED";

    private final UserRepository userRepository;
    private final WasteAssignmentRepository wasteAssignmentRepository;
    private final WastePhotoRepository wastePhotoRepository;
    private final WasteStatusTransitionService wasteStatusTransitionService;
    private final WastePricingService wastePricingService;

    public DriverWasteRequestService(
            UserRepository userRepository,
            WasteAssignmentRepository wasteAssignmentRepository,
            WastePhotoRepository wastePhotoRepository,
            WasteStatusTransitionService wasteStatusTransitionService,
            WastePricingService wastePricingService
    ) {
        this.userRepository = userRepository;
        this.wasteAssignmentRepository = wasteAssignmentRepository;
        this.wastePhotoRepository = wastePhotoRepository;
        this.wasteStatusTransitionService = wasteStatusTransitionService;
        this.wastePricingService = wastePricingService;
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

    @Transactional
    public WasteRequestResponse measureAssignedRequest(String email, Long requestId, MeasureWasteRequest request) {
        UserEntity driver = findUserByEmail(email);
        wasteAssignmentRepository.findByRequestIdAndDriver(requestId, driver)
                .orElseThrow(WasteRequestNotFoundException::new);

        WasteRequestEntity updated = wasteStatusTransitionService.transition(requestId, MEASURED, email);
        updated.markMeasured(request.measuredWeightKg(), driver, Instant.now());
        updated.updateFinalAmount(wastePricingService.calculateFinalAmount(request.measuredWeightKg()));

        List<WastePhotoEntity> photos = request.photoUrls()
                .stream()
                .map(url -> new WastePhotoEntity(updated, url, null))
                .toList();
        wastePhotoRepository.saveAll(photos);

        return toWasteRequestResponse(updated);
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

    private WasteRequestResponse toWasteRequestResponse(WasteRequestEntity request) {
        return new WasteRequestResponse(
                request.getId(),
                request.getUser().getId(),
                request.getAddress(),
                request.getContactPhone(),
                request.getNote(),
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
