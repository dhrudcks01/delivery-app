package com.delivery.waste.repository;

import com.delivery.auth.entity.UserEntity;
import com.delivery.waste.entity.WasteAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WasteAssignmentRepository extends JpaRepository<WasteAssignmentEntity, Long> {

    boolean existsByRequestId(Long requestId);

    List<WasteAssignmentEntity> findAllByDriverOrderByAssignedAtDesc(UserEntity driver);

    Optional<WasteAssignmentEntity> findByRequestIdAndDriver(Long requestId, UserEntity driver);

    Optional<WasteAssignmentEntity> findByRequestId(Long requestId);
}
