package com.delivery.auth.service;

import com.delivery.auth.dto.CreateSysAdminApplicationRequest;
import com.delivery.auth.dto.SysAdminApplicationResponse;
import com.delivery.auth.entity.SysAdminApplicationEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.SysAdminApplicationConflictException;
import com.delivery.auth.exception.SysAdminApplicationNotAllowedException;
import com.delivery.auth.exception.SysAdminApplicationNotFoundException;
import com.delivery.auth.exception.SysAdminApplicationStatusConflictException;
import com.delivery.auth.exception.SysAdminSelfApprovalNotAllowedException;
import com.delivery.auth.repository.SysAdminApplicationRepository;
import com.delivery.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class SysAdminApplicationService {

    private static final String PENDING = "PENDING";
    private static final String APPROVED = "APPROVED";
    private static final String REJECTED = "REJECTED";
    private static final String OPS_ADMIN = "OPS_ADMIN";
    private static final String SYS_ADMIN = "SYS_ADMIN";

    private final UserRepository userRepository;
    private final SysAdminApplicationRepository sysAdminApplicationRepository;
    private final RoleManagementService roleManagementService;

    public SysAdminApplicationService(
            UserRepository userRepository,
            SysAdminApplicationRepository sysAdminApplicationRepository,
            RoleManagementService roleManagementService
    ) {
        this.userRepository = userRepository;
        this.sysAdminApplicationRepository = sysAdminApplicationRepository;
        this.roleManagementService = roleManagementService;
    }

    @Transactional
    public SysAdminApplicationResponse create(String email, CreateSysAdminApplicationRequest request) {
        UserEntity user = findUserByEmail(email);
        validateApplicant(user);

        if (userRepository.countRoleByUserIdAndRoleCode(user.getId(), SYS_ADMIN) > 0) {
            throw new SysAdminApplicationConflictException("이미 SYS_ADMIN 권한을 보유하고 있습니다.");
        }
        if (sysAdminApplicationRepository.existsByUserAndStatus(user, PENDING)) {
            throw new SysAdminApplicationConflictException("처리 대기 중인 SYS_ADMIN 권한 신청이 이미 존재합니다.");
        }

        SysAdminApplicationEntity saved = sysAdminApplicationRepository.save(
                new SysAdminApplicationEntity(user, PENDING, request.reason().trim())
        );
        return toResponse(saved);
    }

    @Transactional
    public Page<SysAdminApplicationResponse> getApplicationsForSysAdmin(String status, Pageable pageable) {
        Page<SysAdminApplicationEntity> page;
        if (status == null || status.isBlank()) {
            page = sysAdminApplicationRepository.findAll(pageable);
        } else {
            page = sysAdminApplicationRepository.findAllByStatus(status.trim().toUpperCase(), pageable);
        }
        return page.map(this::toResponse);
    }

    @Transactional
    public SysAdminApplicationResponse approve(String actorEmail, Long applicationId) {
        return process(actorEmail, applicationId, APPROVED);
    }

    @Transactional
    public SysAdminApplicationResponse reject(String actorEmail, Long applicationId) {
        return process(actorEmail, applicationId, REJECTED);
    }

    private SysAdminApplicationResponse process(String actorEmail, Long applicationId, String nextStatus) {
        UserEntity actor = findUserByEmail(actorEmail);
        SysAdminApplicationEntity entity = sysAdminApplicationRepository.findById(applicationId)
                .orElseThrow(SysAdminApplicationNotFoundException::new);

        if (!PENDING.equals(entity.getStatus())) {
            throw new SysAdminApplicationStatusConflictException();
        }
        if (APPROVED.equals(nextStatus) && actor.getId().equals(entity.getUser().getId())) {
            throw new SysAdminSelfApprovalNotAllowedException();
        }

        entity.markProcessed(nextStatus, actor, Instant.now());
        if (APPROVED.equals(nextStatus)) {
            roleManagementService.grantSysAdminRole(entity.getUser().getId());
        }
        return toResponse(entity);
    }

    private void validateApplicant(UserEntity user) {
        long opsAdminRoleCount = userRepository.countRoleByUserIdAndRoleCode(user.getId(), OPS_ADMIN);
        if (opsAdminRoleCount == 0) {
            throw new SysAdminApplicationNotAllowedException();
        }
    }

    private UserEntity findUserByEmail(String email) {
        return userRepository.findByLoginId(email)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private SysAdminApplicationResponse toResponse(SysAdminApplicationEntity entity) {
        UserEntity applicant = entity.getUser();
        UserEntity processor = entity.getProcessedBy();
        return new SysAdminApplicationResponse(
                entity.getId(),
                applicant.getId(),
                applicant.getLoginId(),
                applicant.getDisplayName(),
                entity.getStatus(),
                entity.getReason(),
                processor != null ? processor.getId() : null,
                processor != null ? processor.getLoginId() : null,
                entity.getProcessedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
