package com.delivery.waste.repository;

import com.delivery.auth.entity.UserEntity;
import com.delivery.waste.entity.WasteRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WasteRequestRepository extends JpaRepository<WasteRequestEntity, Long> {

    List<WasteRequestEntity> findAllByUserOrderByCreatedAtDesc(UserEntity user);

    Optional<WasteRequestEntity> findByIdAndUser(Long id, UserEntity user);
}
