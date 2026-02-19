package com.delivery.auth.service;

import com.delivery.auth.exception.UserNotFoundException;
import com.delivery.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class RoleManagementService {

    private static final String OPS_ADMIN = "OPS_ADMIN";

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public RoleManagementService(UserRepository userRepository, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void grantOpsAdminRole(Long userId) {
        ensureUserExists(userId);
        Long roleId = ensureOpsAdminRole();

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_roles WHERE user_id = ? AND role_id = ?",
                Integer.class,
                userId,
                roleId
        );
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
                    userId,
                    roleId
            );
        }
    }

    @Transactional
    public void revokeOpsAdminRole(Long userId) {
        ensureUserExists(userId);
        jdbcTemplate.update(
                """
                DELETE FROM user_roles
                WHERE user_id = ?
                  AND role_id IN (SELECT id FROM roles WHERE code = ?)
                """,
                userId,
                OPS_ADMIN
        );
    }

    private void ensureUserExists(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException();
        }
    }

    private Long ensureOpsAdminRole() {
        Long roleId = jdbcTemplate.query(
                "SELECT id FROM roles WHERE code = ?",
                ps -> ps.setString(1, OPS_ADMIN),
                rs -> rs.next() ? rs.getLong("id") : null
        );
        if (roleId != null) {
            return roleId;
        }

        jdbcTemplate.update(
                "INSERT INTO roles (code, description) VALUES (?, ?)",
                OPS_ADMIN,
                "운영 관리자"
        );

        return jdbcTemplate.queryForObject(
                "SELECT id FROM roles WHERE code = ?",
                Long.class,
                OPS_ADMIN
        );
    }
}
