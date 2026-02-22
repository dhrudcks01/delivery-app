package com.delivery.driver.repository;

import com.delivery.auth.entity.UserEntity;
import com.delivery.driver.entity.DriverApplicationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DriverApplicationRepository extends JpaRepository<DriverApplicationEntity, Long> {

    List<DriverApplicationEntity> findAllByUserOrderByCreatedAtDesc(UserEntity user);

    Page<DriverApplicationEntity> findAllByStatus(String status, Pageable pageable);

    Optional<DriverApplicationEntity> findByIdAndUser(Long id, UserEntity user);
}
