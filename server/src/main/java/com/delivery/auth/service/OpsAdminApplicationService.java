package com.delivery.auth.service;

import com.delivery.auth.dto.CreateOpsAdminApplicationRequest;
import com.delivery.auth.dto.OpsAdminApplicationResponse;
import com.delivery.auth.entity.OpsAdminApplicationEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.OpsAdminApplicationConflictException;
import com.delivery.auth.exception.OpsAdminApplicationNotAllowedException;
import com.delivery.auth.exception.OpsAdminApplicationNotFoundException;
import com.delivery.auth.exception.OpsAdminApplicationStatusConflictException;
import com.delivery.auth.repository.OpsAdminApplicationRepository;
import com.delivery.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class OpsAdminApplicationService {

    private static final String PENDING = "PENDING";
    private static final String APPROVED = "APPROVED";
    private static final String REJECTED = "REJECTED";
    private static final String USER = "USER";
    private static final String DRIVER = "DRIVER";
    private static final String OPS_ADMIN = "OPS_ADMIN";

    private final UserRepository userRepository;
    private final OpsAdminApplicationRepository opsAdminApplicationRepository;
    private final RoleManagementService roleManagementService;

    public OpsAdminApplicationService(
            UserRepository userRepository,
            OpsAdminApplicationRepository opsAdminApplicationRepository,
            RoleManagementService roleManagementService
    ) {
        this.userRepository = userRepository;
        this.opsAdminApplicationRepository = opsAdminApplicationRepository;
        this.roleManagementService = roleManagementService;
    }

    @Transactional
    public OpsAdminApplicationResponse create(String email, CreateOpsAdminApplicationRequest request) {
        UserEntity user = findUserByEmail(email);
        validateApplicant(user);

        if (userRepository.countRoleByUserIdAndRoleCode(user.getId(), OPS_ADMIN) > 0) {
            throw new OpsAdminApplicationConflictException("이미 OPS_ADMIN 권한을 보유하고 있습니다.");
        }
        if (opsAdminApplicationRepository.existsByUserAndStatus(user, PENDING)) {
            throw new OpsAdminApplicationConflictException("처리 대기 중인 OPS_ADMIN 권한 신청이 이미 존재합니다.");
        }

        OpsAdminApplicationEntity saved = opsAdminApplicationRepository.save(
                new OpsAdminApplicationEntity(user, PENDING, request.reason().trim())
        );
        return toResponse(saved);
    }

    @Transactional
    public Page<OpsAdminApplicationResponse> getApplicationsForSysAdmin(String status, Pageable pageable) {
        Page<OpsAdminApplicationEntity> page;
        if (status == null || status.isBlank()) {
            page = opsAdminApplicationRepository.findAll(pageable);
        } else {
            page = opsAdminApplicationRepository.findAllByStatus(status.trim().toUpperCase(), pageable);
        }
        return page.map(this::toResponse);
    }

    @Transactional
    public OpsAdminApplicationResponse approve(String actorEmail, Long applicationId) {
        return process(actorEmail, applicationId, APPROVED);
    }

    @Transactional
    public OpsAdminApplicationResponse reject(String actorEmail, Long applicationId) {
        return process(actorEmail, applicationId, REJECTED);
    }

    private OpsAdminApplicationResponse process(String actorEmail, Long applicationId, String nextStatus) {
        UserEntity actor = findUserByEmail(actorEmail);
        OpsAdminApplicationEntity entity = opsAdminApplicationRepository.findById(applicationId)
                .orElseThrow(OpsAdminApplicationNotFoundException::new);

        if (!PENDING.equals(entity.getStatus())) {
            throw new OpsAdminApplicationStatusConflictException();
        }

        entity.markProcessed(nextStatus, actor, Instant.now());
        if (APPROVED.equals(nextStatus)) {
            roleManagementService.grantOpsAdminRole(entity.getUser().getId());
        }
        return toResponse(entity);
    }

    private void validateApplicant(UserEntity user) {
        long userRoleCount = userRepository.countRoleByUserIdAndRoleCode(user.getId(), USER);
        long driverRoleCount = userRepository.countRoleByUserIdAndRoleCode(user.getId(), DRIVER);
        if (userRoleCount == 0 && driverRoleCount == 0) {
            throw new OpsAdminApplicationNotAllowedException();
        }
    }

    private UserEntity findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private OpsAdminApplicationResponse toResponse(OpsAdminApplicationEntity entity) {
        UserEntity applicant = entity.getUser();
        UserEntity processor = entity.getProcessedBy();
        return new OpsAdminApplicationResponse(
                entity.getId(),
                applicant.getId(),
                applicant.getEmail(),
                applicant.getDisplayName(),
                entity.getStatus(),
                entity.getReason(),
                processor != null ? processor.getId() : null,
                processor != null ? processor.getEmail() : null,
                entity.getProcessedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
