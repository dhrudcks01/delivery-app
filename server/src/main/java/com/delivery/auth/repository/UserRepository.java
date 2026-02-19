package com.delivery.auth.repository;

import java.util.Optional;
import java.util.List;

import com.delivery.auth.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    boolean existsByEmail(String email);

    Optional<UserEntity> findByEmail(String email);

    @Query(
            value = """
                    SELECT r.code
                    FROM roles r
                    JOIN user_roles ur ON ur.role_id = r.id
                    JOIN users u ON u.id = ur.user_id
                    WHERE u.email = :email
                    ORDER BY r.code
                    """,
            nativeQuery = true
    )
    List<String> findRoleCodesByEmail(@Param("email") String email);
}
