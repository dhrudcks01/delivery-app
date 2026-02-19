package com.delivery.waste.repository;

import com.delivery.waste.entity.WastePhotoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WastePhotoRepository extends JpaRepository<WastePhotoEntity, Long> {

    long countByRequestId(Long requestId);
}
