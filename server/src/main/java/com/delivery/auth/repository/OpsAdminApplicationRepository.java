package com.delivery.auth.repository;

import com.delivery.auth.entity.OpsAdminApplicationEntity;
import com.delivery.auth.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpsAdminApplicationRepository extends JpaRepository<OpsAdminApplicationEntity, Long> {

    boolean existsByUserAndStatus(UserEntity user, String status);

    Page<OpsAdminApplicationEntity> findAllByStatus(String status, Pageable pageable);
}
