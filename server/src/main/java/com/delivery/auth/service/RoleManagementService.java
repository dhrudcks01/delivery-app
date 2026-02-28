package com.delivery.auth.service;

import com.delivery.auth.dto.OpsAdminGrantCandidateResponse;
import com.delivery.auth.dto.SysAdminGrantCandidateResponse;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.OpsAdminGrantTargetNotAllowedException;
import com.delivery.auth.exception.SysAdminGrantTargetNotAllowedException;
import com.delivery.auth.exception.SysAdminSelfRoleChangeNotAllowedException;
import com.delivery.auth.exception.UserNotFoundException;
import com.delivery.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleManagementService {

    private static final Logger log = LoggerFactory.getLogger(RoleManagementService.class);
    private static final String OPS_ADMIN = "OPS_ADMIN";
    private static final String SYS_ADMIN = "SYS_ADMIN";
    private static final String DRIVER = "DRIVER";
    private static final String ACTION_GRANT = "GRANT";
    private static final String ACTION_REVOKE = "REVOKE";

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
    public void grantOpsAdminRole(String actorEmail, Long userId) {
        UserEntity actor = findUserByEmail(actorEmail);
        grantOpsAdminRole(userId);
        recordRoleChangeAudit(actor.getId(), userId, OPS_ADMIN, ACTION_GRANT);
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
    public void revokeOpsAdminRole(String actorEmail, Long userId) {
        UserEntity actor = findUserByEmail(actorEmail);
        revokeOpsAdminRole(userId);
        recordRoleChangeAudit(actor.getId(), userId, OPS_ADMIN, ACTION_REVOKE);
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
                    OR LOWER(u.login_id) LIKE LOWER(?)
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
                SELECT u.id, u.login_id, u.display_name
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
                    OR LOWER(u.login_id) LIKE LOWER(?)
                    OR LOWER(u.display_name) LIKE LOWER(?)
                )
                ORDER BY u.id DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new OpsAdminGrantCandidateResponse(
                        rs.getLong("id"),
                        rs.getString("login_id"),
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
        validateSysAdminGrantTarget(userId);
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

    @Transactional
    public void grantSysAdminRole(String actorEmail, Long userId) {
        UserEntity actor = findUserByEmail(actorEmail);
        validateSysAdminRoleChangeActor(actor.getId(), userId);
        grantSysAdminRole(userId);
        recordRoleChangeAudit(actor.getId(), userId, SYS_ADMIN, ACTION_GRANT);
    }

    @Transactional
    public void revokeSysAdminRole(String actorEmail, Long userId) {
        UserEntity actor = findUserByEmail(actorEmail);
        validateSysAdminRoleChangeActor(actor.getId(), userId);
        ensureUserExists(userId);
        jdbcTemplate.update(
                """
                DELETE FROM user_roles
                WHERE user_id = ?
                  AND role_id IN (SELECT id FROM roles WHERE code = ?)
                """,
                userId,
                SYS_ADMIN
        );
        recordRoleChangeAudit(actor.getId(), userId, SYS_ADMIN, ACTION_REVOKE);
    }

    @Transactional
    public Page<SysAdminGrantCandidateResponse> getSysAdminGrantCandidates(String query, Pageable pageable) {
        String keyword = query == null ? "" : query.trim();
        String likeKeyword = "%" + keyword + "%";

        Integer total = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM users u
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.code = ?
                )
                AND (
                    ? = ''
                    OR LOWER(u.login_id) LIKE LOWER(?)
                    OR LOWER(u.display_name) LIKE LOWER(?)
                )
                """,
                Integer.class,
                SYS_ADMIN,
                keyword,
                likeKeyword,
                likeKeyword
        );

        List<SysAdminGrantCandidateResponse> content = jdbcTemplate.query(
                """
                SELECT u.id, u.login_id, u.display_name
                FROM users u
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND r.code = ?
                )
                AND (
                    ? = ''
                    OR LOWER(u.login_id) LIKE LOWER(?)
                    OR LOWER(u.display_name) LIKE LOWER(?)
                )
                ORDER BY u.id DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new SysAdminGrantCandidateResponse(
                        rs.getLong("id"),
                        rs.getString("login_id"),
                        rs.getString("display_name")
                ),
                SYS_ADMIN,
                keyword,
                likeKeyword,
                likeKeyword,
                pageable.getPageSize(),
                pageable.getOffset()
        );

        long totalElements = total == null ? 0 : total;
        return new PageImpl<>(content, pageable, totalElements);
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

    private void validateSysAdminGrantTarget(Long userId) {
        long sysAdminRoleCount = userRepository.countRoleByUserIdAndRoleCode(userId, SYS_ADMIN);
        if (sysAdminRoleCount > 0) {
            throw new SysAdminGrantTargetNotAllowedException();
        }
    }

    private void validateSysAdminRoleChangeActor(Long actorUserId, Long targetUserId) {
        if (actorUserId.equals(targetUserId)) {
            throw new SysAdminSelfRoleChangeNotAllowedException();
        }
    }

    private UserEntity findUserByEmail(String email) {
        return userRepository.findByLoginId(email)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private void recordRoleChangeAudit(Long actorUserId, Long targetUserId, String roleCode, String action) {
        jdbcTemplate.update(
                """
                INSERT INTO role_change_audit_logs (actor_user_id, target_user_id, role_code, action)
                VALUES (?, ?, ?, ?)
                """,
                actorUserId,
                targetUserId,
                roleCode,
                action
        );
        String actorLoginId = resolveLoginId(actorUserId);
        String targetLoginId = resolveLoginId(targetUserId);
        log.info(
                "roleChangeAudit actorUserId={} actorLoginId={} targetUserId={} targetLoginId={} roleCode={} action={}",
                actorUserId,
                actorLoginId,
                targetUserId,
                targetLoginId,
                roleCode,
                action
        );
    }

    private String resolveLoginId(Long userId) {
        return userRepository.findById(userId)
                .map(UserEntity::getLoginId)
                .orElse("unknown");
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
