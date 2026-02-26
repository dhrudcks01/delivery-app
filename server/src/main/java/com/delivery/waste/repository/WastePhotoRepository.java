package com.delivery.waste.repository;

import com.delivery.waste.entity.WasteRequestEntity;
import com.delivery.waste.entity.WastePhotoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WastePhotoRepository extends JpaRepository<WastePhotoEntity, Long> {

    long countByRequestId(Long requestId);

    List<WastePhotoEntity> findAllByRequestOrderByCreatedAtAsc(WasteRequestEntity request);
}
