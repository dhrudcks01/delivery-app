package com.delivery.auth.repository;

import com.delivery.auth.entity.AuthIdentityEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentityEntity, Long> {

    boolean existsByProviderAndProviderUserId(String provider, String providerUserId);
}
