package com.delivery.waste.service;

import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.PhoneVerificationException;
import com.delivery.auth.exception.UserNotFoundException;
import com.delivery.auth.repository.UserRepository;
import com.delivery.servicearea.service.ServiceAreaService;
import com.delivery.waste.dto.AssignWasteRequest;
import com.delivery.waste.dto.CreateWasteRequestRequest;
import com.delivery.waste.dto.DriverAssignmentCandidateResponse;
import com.delivery.waste.dto.WasteRequestDetailResponse;
import com.delivery.waste.dto.WasteRequestResponse;
import com.delivery.waste.entity.WasteAssignmentEntity;
import com.delivery.waste.entity.WastePhotoEntity;
import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.entity.WasteStatusLogEntity;
import com.delivery.waste.exception.DriverRoleRequiredException;
import com.delivery.waste.exception.WasteRequestAccessDeniedException;
import com.delivery.waste.exception.WasteRequestNotFoundException;
import com.delivery.waste.repository.WasteAssignmentRepository;
import com.delivery.waste.repository.WastePhotoRepository;
import com.delivery.waste.repository.WasteRequestRepository;
import com.delivery.waste.repository.WasteStatusLogRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class WasteRequestService {

    private static final String REQUESTED = "REQUESTED";
    private static final String CANCELED = "CANCELED";
    private static final String KRW = "KRW";
    private static final String ASSIGNED = "ASSIGNED";
    private static final String DRIVER = "DRIVER";
    private static final String ACTIVE = "ACTIVE";
    private static final String PHONE_VERIFICATION_REQUIRED = "PHONE_VERIFICATION_REQUIRED";

    private final WasteRequestRepository wasteRequestRepository;
    private final WasteAssignmentRepository wasteAssignmentRepository;
    private final WastePhotoRepository wastePhotoRepository;
    private final WasteStatusLogRepository wasteStatusLogRepository;
    private final UserRepository userRepository;
    private final ServiceAreaService serviceAreaService;
    private final WasteStatusTransitionService wasteStatusTransitionService;
    private final JdbcTemplate jdbcTemplate;

    public WasteRequestService(
            WasteRequestRepository wasteRequestRepository,
            WasteAssignmentRepository wasteAssignmentRepository,
            WastePhotoRepository wastePhotoRepository,
            WasteStatusLogRepository wasteStatusLogRepository,
            UserRepository userRepository,
            ServiceAreaService serviceAreaService,
            WasteStatusTransitionService wasteStatusTransitionService,
            JdbcTemplate jdbcTemplate
    ) {
        this.wasteRequestRepository = wasteRequestRepository;
        this.wasteAssignmentRepository = wasteAssignmentRepository;
        this.wastePhotoRepository = wastePhotoRepository;
        this.wasteStatusLogRepository = wasteStatusLogRepository;
        this.userRepository = userRepository;
        this.serviceAreaService = serviceAreaService;
        this.wasteStatusTransitionService = wasteStatusTransitionService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public WasteRequestResponse create(String email, CreateWasteRequestRequest request) {
        UserEntity user = findUserByEmail(email);
        String verifiedPhone = resolveVerifiedPhone(user);
        serviceAreaService.validateAvailableAddress(request.address());
        WasteRequestEntity saved = wasteRequestRepository.save(new WasteRequestEntity(
                user,
                request.address(),
                verifiedPhone,
                request.note(),
                REQUESTED,
                KRW,
                request.normalizedDisposalItems(),
                request.normalizedBagCount()
        ));
        saved.assignOrderNo(WasteOrderNoPolicy.generate(saved.getId()));
        return toResponse(saved);
    }

    @Transactional
    public List<WasteRequestResponse> getMyRequests(String email) {
        UserEntity user = findUserByEmail(email);
        return wasteRequestRepository.findAllByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WasteRequestDetailResponse getMyRequest(String email, Long requestId) {
        UserEntity user = findUserByEmail(email);
        WasteRequestEntity request = wasteRequestRepository.findById(requestId)
                .orElseThrow(WasteRequestNotFoundException::new);
        if (!request.getUser().getId().equals(user.getId())) {
            throw new WasteRequestAccessDeniedException();
        }
        return toDetailResponse(request, false);
    }

    @Transactional
    public WasteRequestResponse cancelMyRequest(String email, Long requestId) {
        WasteRequestEntity updated = wasteStatusTransitionService.transitionForOwner(requestId, CANCELED, email);
        return toResponse(updated);
    }

    @Transactional
    public Page<WasteRequestResponse> getAllForOps(String status, Pageable pageable) {
        Page<WasteRequestEntity> page;
        if (status == null || status.isBlank()) {
            page = wasteRequestRepository.findAll(pageable);
        } else {
            page = wasteRequestRepository.findAllByStatus(status, pageable);
        }
        return page.map(this::toResponse);
    }

    @Transactional
    public WasteRequestDetailResponse getDetailForOps(Long requestId) {
        WasteRequestEntity request = wasteRequestRepository.findById(requestId)
                .orElseThrow(WasteRequestNotFoundException::new);
        return toDetailResponse(request, true);
    }

    @Transactional
    public Page<DriverAssignmentCandidateResponse> getDriverCandidatesForOps(String query, Pageable pageable) {
        String keyword = query == null ? "" : query.trim();
        String likeKeyword = "%" + keyword + "%";

        Integer total = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM users u
                WHERE u.status = ?
                  AND EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = u.id
                        AND r.code = ?
                  )
                  AND (
                      ? = ''
                      OR LOWER(u.display_name) LIKE LOWER(?)
                      OR LOWER(u.login_id) LIKE LOWER(?)
                  )
                """,
                Integer.class,
                ACTIVE,
                DRIVER,
                keyword,
                likeKeyword,
                likeKeyword
        );

        List<DriverAssignmentCandidateResponse> content = jdbcTemplate.query(
                """
                SELECT u.id, u.login_id, u.display_name
                FROM users u
                WHERE u.status = ?
                  AND EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = u.id
                        AND r.code = ?
                  )
                  AND (
                      ? = ''
                      OR LOWER(u.display_name) LIKE LOWER(?)
                      OR LOWER(u.login_id) LIKE LOWER(?)
                  )
                ORDER BY u.id DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new DriverAssignmentCandidateResponse(
                        rs.getLong("id"),
                        rs.getString("login_id"),
                        rs.getString("display_name")
                ),
                ACTIVE,
                DRIVER,
                keyword,
                likeKeyword,
                likeKeyword,
                pageable.getPageSize(),
                pageable.getOffset()
        );

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    @Transactional
    public WasteRequestResponse assignForOps(Long requestId, AssignWasteRequest request, String actorEmail) {
        UserEntity driver = userRepository.findById(request.driverId())
                .orElseThrow(UserNotFoundException::new);
        if (!isAssignableDriver(driver)) {
            throw new DriverRoleRequiredException();
        }

        WasteRequestEntity updated = wasteStatusTransitionService.transition(requestId, ASSIGNED, actorEmail);
        if (!wasteAssignmentRepository.existsByRequestId(updated.getId())) {
            wasteAssignmentRepository.save(new WasteAssignmentEntity(updated, driver));
        }
        return toResponse(updated);
    }

    private boolean isAssignableDriver(UserEntity user) {
        boolean isDriver = userRepository.countRoleByUserIdAndRoleCode(user.getId(), DRIVER) > 0;
        boolean isActive = ACTIVE.equalsIgnoreCase(user.getStatus());
        return isDriver && isActive;
    }

    private UserEntity findUserByEmail(String email) {
        return userRepository.findByLoginId(email)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private String resolveVerifiedPhone(UserEntity user) {
        if (user.getPhoneVerifiedAt() == null || !StringUtils.hasText(user.getPhoneE164())) {
            throw new PhoneVerificationException(
                    HttpStatus.FORBIDDEN,
                    PHONE_VERIFICATION_REQUIRED,
                    "휴대폰 본인인증이 필요합니다."
            );
        }
        return user.getPhoneE164().trim();
    }

    private WasteRequestResponse toResponse(WasteRequestEntity request) {
        return new WasteRequestResponse(
                request.getId(),
                WasteOrderNoPolicy.resolve(request.getOrderNo(), request.getId()),
                request.getUser().getId(),
                request.getAddress(),
                request.getContactPhone(),
                request.getNote(),
                request.getDisposalItems(),
                request.getBagCount(),
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

    private WasteRequestDetailResponse toDetailResponse(WasteRequestEntity request, boolean includeAssignment) {
        List<WastePhotoEntity> photos = wastePhotoRepository.findAllByRequestOrderByCreatedAtAsc(request);
        List<WasteStatusLogEntity> statusLogs = wasteStatusLogRepository.findByRequestOrderByCreatedAtAsc(request);

        WasteAssignmentEntity assignment = includeAssignment
                ? wasteAssignmentRepository.findByRequestId(request.getId()).orElse(null)
                : null;

        return new WasteRequestDetailResponse(
                request.getId(),
                WasteOrderNoPolicy.resolve(request.getOrderNo(), request.getId()),
                request.getUser().getId(),
                request.getStatus(),
                request.getAddress(),
                request.getContactPhone(),
                request.getNote(),
                request.getDisposalItems(),
                request.getBagCount(),
                photos.stream()
                        .map(photo -> new WasteRequestDetailResponse.PhotoItem(
                                photo.getUrl(),
                                photo.getType(),
                                photo.getCreatedAt()
                        ))
                        .toList(),
                request.getMeasuredWeightKg(),
                request.getMeasuredAt(),
                request.getMeasuredByDriver() != null ? request.getMeasuredByDriver().getId() : null,
                request.getFinalAmount(),
                request.getCurrency(),
                statusLogs.stream()
                        .map(log -> new WasteRequestDetailResponse.StatusTimelineItem(
                                log.getFromStatus(),
                                log.getToStatus(),
                                log.getCreatedAt()
                        ))
                        .toList(),
                assignment != null ? assignment.getDriver().getId() : null,
                assignment != null ? assignment.getAssignedAt() : null,
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}
