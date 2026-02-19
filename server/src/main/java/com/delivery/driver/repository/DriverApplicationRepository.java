package com.delivery.driver.repository;

import com.delivery.driver.entity.DriverApplicationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverApplicationRepository extends JpaRepository<DriverApplicationEntity, Long> {
}
