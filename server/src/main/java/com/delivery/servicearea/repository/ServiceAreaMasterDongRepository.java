package com.delivery.servicearea.repository;

import com.delivery.servicearea.entity.ServiceAreaMasterDongEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServiceAreaMasterDongRepository extends JpaRepository<ServiceAreaMasterDongEntity, String> {

    @Query("""
            SELECT m
            FROM ServiceAreaMasterDongEntity m
            WHERE (:active IS NULL OR m.active = :active)
              AND (:keyword = '' OR LOWER(m.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(m.city) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(m.district) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(m.dong) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<ServiceAreaMasterDongEntity> searchForOps(
            @Param("keyword") String keyword,
            @Param("active") Boolean active,
            Pageable pageable
    );

    long countByActiveTrue();

    @Query("SELECT COUNT(DISTINCT m.city) FROM ServiceAreaMasterDongEntity m")
    long countDistinctCity();

    @Query("SELECT COUNT(DISTINCT CONCAT(CONCAT(m.city, '|'), m.district)) FROM ServiceAreaMasterDongEntity m")
    long countDistinctCityDistrict();
}
