package com.delivery.auth.service;

import com.delivery.auth.dto.OpsAdminGrantCandidateResponse;
import com.delivery.auth.exception.OpsAdminGrantTargetNotAllowedException;
import com.delivery.auth.exception.UserNotFoundException;
import com.delivery.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleManagementService {

    private static final String OPS_ADMIN = "OPS_ADMIN";
    private static final String SYS_ADMIN = "SYS_ADMIN";
    private static final String DRIVER = "DRIVER";

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public RoleManagementService(UserRepository userRepository, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void grantOpsAdminRole(Long userId) {
        ensureUserExists(userId);
        validateOpsAdminGrantTarget(userId);
        Long roleId = ensureRole(OPS_ADMIN, "운영 관리자");

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

    @Transactional
    public Page<OpsAdminGrantCandidateResponse> getOpsAdminGrantCandidates(String query, Pageable pageable) {
        String keyword = query == null ? "" : query.trim();
        String likeKeyword = "%" + keyword + "%";

        Integer total = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM users u
                WHERE EXISTS (
                    SELECT 1
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.code = ?
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.code = ?
                )
                AND (
                    ? = ''
                    OR LOWER(u.email) LIKE LOWER(?)
                    OR LOWER(u.display_name) LIKE LOWER(?)
                )
                """,
                Integer.class,
                DRIVER,
                OPS_ADMIN,
                keyword,
                likeKeyword,
                likeKeyword
        );

        List<OpsAdminGrantCandidateResponse> content = jdbcTemplate.query(
                """
                SELECT u.id, u.email, u.display_name
                FROM users u
                WHERE EXISTS (
                    SELECT 1
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.code = ?
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.code = ?
                )
                AND (
                    ? = ''
                    OR LOWER(u.email) LIKE LOWER(?)
                    OR LOWER(u.display_name) LIKE LOWER(?)
                )
                ORDER BY u.id DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new OpsAdminGrantCandidateResponse(
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("display_name")
                ),
                DRIVER,
                OPS_ADMIN,
                keyword,
                likeKeyword,
                likeKeyword,
                pageable.getPageSize(),
                pageable.getOffset()
        );

        long totalElements = total == null ? 0 : total;
        return new PageImpl<>(content, pageable, totalElements);
    }

    @Transactional
    public void grantSysAdminRole(Long userId) {
        ensureUserExists(userId);
        Long roleId = ensureRole(SYS_ADMIN, "시스템 관리자");

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

    private void ensureUserExists(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException();
        }
    }

    private void validateOpsAdminGrantTarget(Long userId) {
        long driverRoleCount = userRepository.countRoleByUserIdAndRoleCode(userId, DRIVER);
        long opsAdminRoleCount = userRepository.countRoleByUserIdAndRoleCode(userId, OPS_ADMIN);
        if (driverRoleCount == 0 || opsAdminRoleCount > 0) {
            throw new OpsAdminGrantTargetNotAllowedException();
        }
    }

    private Long ensureRole(String code, String description) {
        Long roleId = jdbcTemplate.query(
                "SELECT id FROM roles WHERE code = ?",
                ps -> ps.setString(1, code),
                rs -> rs.next() ? rs.getLong("id") : null
        );
        if (roleId != null) {
            return roleId;
        }

        jdbcTemplate.update(
                "INSERT INTO roles (code, description) VALUES (?, ?)",
                code,
                description
        );

        return jdbcTemplate.queryForObject(
                "SELECT id FROM roles WHERE code = ?",
                Long.class,
                code
        );
    }
}
