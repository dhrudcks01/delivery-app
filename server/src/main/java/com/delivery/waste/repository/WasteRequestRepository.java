package com.delivery.waste.repository;

import com.delivery.waste.entity.WasteRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WasteRequestRepository extends JpaRepository<WasteRequestEntity, Long> {
}
