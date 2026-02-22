package com.delivery.auth.repository;

import com.delivery.auth.entity.LoginAuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginAuditLogRepository extends JpaRepository<LoginAuditLogEntity, Long> {

    Page<LoginAuditLogEntity> findAllByResult(String result, Pageable pageable);

    Page<LoginAuditLogEntity> findAllByLoginIdentifierContainingIgnoreCase(String loginIdentifier, Pageable pageable);

    Page<LoginAuditLogEntity> findAllByLoginIdentifierContainingIgnoreCaseAndResult(
            String loginIdentifier,
            String result,
            Pageable pageable
    );
}
