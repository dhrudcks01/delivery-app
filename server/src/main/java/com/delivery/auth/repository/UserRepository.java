package com.delivery.auth.repository;

import java.util.Optional;
import java.util.List;

import com.delivery.auth.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    boolean existsByLoginId(String loginId);

    Optional<UserEntity> findByLoginId(String loginId);

    @Deprecated
    default boolean existsByEmail(String email) {
        return existsByLoginId(email);
    }

    @Deprecated
    default Optional<UserEntity> findByEmail(String email) {
        return findByLoginId(email);
    }

    @Query(
            value = """
                    SELECT r.code
                    FROM roles r
                    JOIN user_roles ur ON ur.role_id = r.id
                    JOIN users u ON u.id = ur.user_id
                    WHERE u.login_id = :loginId
                    ORDER BY r.code
                    """,
            nativeQuery = true
    )
    List<String> findRoleCodesByLoginId(@Param("loginId") String loginId);

    @Deprecated
    default List<String> findRoleCodesByEmail(String email) {
        return findRoleCodesByLoginId(email);
    }

    @Query(
            value = """
                    SELECT COUNT(*)
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = :userId
                      AND r.code = :roleCode
                    """,
            nativeQuery = true
    )
    long countRoleByUserIdAndRoleCode(@Param("userId") Long userId, @Param("roleCode") String roleCode);
}
