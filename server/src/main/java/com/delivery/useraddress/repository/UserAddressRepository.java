package com.delivery.useraddress.repository;

import com.delivery.auth.entity.UserEntity;
import com.delivery.useraddress.entity.UserAddressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserAddressRepository extends JpaRepository<UserAddressEntity, Long> {

    List<UserAddressEntity> findAllByUserOrderByPrimaryAddressDescUpdatedAtDesc(UserEntity user);

    Optional<UserAddressEntity> findByIdAndUser(Long id, UserEntity user);

    Optional<UserAddressEntity> findFirstByUserOrderByCreatedAtAsc(UserEntity user);

    boolean existsByUser(UserEntity user);

    boolean existsByUserAndPrimaryAddressTrue(UserEntity user);

    @Modifying
    @Query("""
            UPDATE UserAddressEntity a
            SET a.primaryAddress = false,
                a.primaryMarker = null
            WHERE a.user.id = :userId
              AND (:excludeAddressId IS NULL OR a.id <> :excludeAddressId)
            """)
    int clearPrimaryForUser(
            @Param("userId") Long userId,
            @Param("excludeAddressId") Long excludeAddressId
    );
}

