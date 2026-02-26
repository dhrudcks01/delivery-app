package com.delivery.auth.repository;

import com.delivery.auth.entity.UserPhoneVerificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserPhoneVerificationRepository extends JpaRepository<UserPhoneVerificationEntity, Long> {

    Optional<UserPhoneVerificationEntity> findByIdentityVerificationId(String identityVerificationId);
}
