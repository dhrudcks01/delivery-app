package com.delivery.servicearea.repository;

import com.delivery.servicearea.entity.ServiceAreaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ServiceAreaRepository extends JpaRepository<ServiceAreaEntity, Long> {

    Optional<ServiceAreaEntity> findByCityAndDistrictAndDong(String city, String district, String dong);

    @Query("""
            SELECT s
            FROM ServiceAreaEntity s
            WHERE (:active IS NULL OR s.active = :active)
              AND (:keyword = '' OR LOWER(s.city) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.district) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.dong) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<ServiceAreaEntity> searchForOps(
            @Param("keyword") String keyword,
            @Param("active") Boolean active,
            Pageable pageable
    );

    @Query("""
            SELECT s
            FROM ServiceAreaEntity s
            WHERE s.active = true
              AND (:keyword = '' OR LOWER(s.city) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.district) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.dong) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<ServiceAreaEntity> searchForUser(@Param("keyword") String keyword, Pageable pageable);
}

