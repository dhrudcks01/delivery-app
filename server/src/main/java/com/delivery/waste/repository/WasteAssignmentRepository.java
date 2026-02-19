package com.delivery.waste.repository;

import com.delivery.waste.entity.WasteAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WasteAssignmentRepository extends JpaRepository<WasteAssignmentEntity, Long> {

    boolean existsByRequestId(Long requestId);
}
