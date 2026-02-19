package com.delivery.waste.repository;

import com.delivery.waste.entity.WasteStatusLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WasteStatusLogRepository extends JpaRepository<WasteStatusLogEntity, Long> {
}
