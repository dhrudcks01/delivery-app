package com.delivery.waste.repository;

import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.entity.WasteStatusLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WasteStatusLogRepository extends JpaRepository<WasteStatusLogEntity, Long> {

    List<WasteStatusLogEntity> findByRequestOrderByCreatedAtAsc(WasteRequestEntity request);
}
