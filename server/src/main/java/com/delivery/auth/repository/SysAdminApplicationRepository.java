package com.delivery.auth.repository;

import com.delivery.auth.entity.SysAdminApplicationEntity;
import com.delivery.auth.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SysAdminApplicationRepository extends JpaRepository<SysAdminApplicationEntity, Long> {

    boolean existsByUserAndStatus(UserEntity user, String status);

    Page<SysAdminApplicationEntity> findAllByStatus(String status, Pageable pageable);
}
