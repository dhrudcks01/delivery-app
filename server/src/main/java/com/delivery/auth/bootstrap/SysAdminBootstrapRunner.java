package com.delivery.auth.bootstrap;

import com.delivery.auth.config.BootstrapSysAdminProperties;
import com.delivery.auth.entity.AuthIdentityEntity;
import com.delivery.auth.entity.UserEntity;
import com.delivery.auth.repository.AuthIdentityRepository;
import com.delivery.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
public class SysAdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SysAdminBootstrapRunner.class);
    private static final String LOCAL_PROVIDER = "LOCAL";
    private static final String SYS_ADMIN_ROLE = "SYS_ADMIN";
    private static final String BOOTSTRAP_KEY = "sys_admin_bootstrap_v1";

    private final BootstrapSysAdminProperties properties;
    private final UserRepository userRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public SysAdminBootstrapRunner(
            BootstrapSysAdminProperties properties,
            UserRepository userRepository,
            AuthIdentityRepository authIdentityRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.authIdentityRepository = authIdentityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = properties.getEmail();
        String password = properties.getPassword();

        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            log.info("SYS_ADMIN 부트스트랩 설정이 없어 초기 계정 생성을 건너뜁니다.");
            return;
        }

        if (isBootstrapCompleted()) {
            log.info("SYS_ADMIN 부트스트랩이 이미 완료되어 생성을 건너뜁니다.");
            return;
        }

        Long roleId = ensureSysAdminRole();
        UserEntity user = userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(new UserEntity(
                        email,
                        passwordEncoder.encode(password),
                        properties.getDisplayName(),
                        "ACTIVE"
                )));

        if (!authIdentityRepository.existsByProviderAndProviderUserId(LOCAL_PROVIDER, email)) {
            authIdentityRepository.save(new AuthIdentityEntity(user, LOCAL_PROVIDER, email));
        }

        ensureUserRole(user.getId(), roleId);
        insertBootstrapMetadata(email);
        log.info("SYS_ADMIN 초기 계정을 준비했습니다. email={}", email);
    }

    private boolean isBootstrapCompleted() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bootstrap_metadata WHERE metadata_key = ?",
                Integer.class,
                BOOTSTRAP_KEY
        );
        return count != null && count > 0;
    }

    private Long ensureSysAdminRole() {
        Long roleId = jdbcTemplate.query(
                "SELECT id FROM roles WHERE code = ?",
                ps -> ps.setString(1, SYS_ADMIN_ROLE),
                rs -> rs.next() ? rs.getLong("id") : null
        );
        if (roleId != null) {
            return roleId;
        }

        jdbcTemplate.update(
                "INSERT INTO roles (code, description) VALUES (?, ?)",
                SYS_ADMIN_ROLE,
                "시스템 관리자"
        );

        return jdbcTemplate.queryForObject(
                "SELECT id FROM roles WHERE code = ?",
                Long.class,
                SYS_ADMIN_ROLE
        );
    }

    private void ensureUserRole(Long userId, Long roleId) {
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

    private void insertBootstrapMetadata(String email) {
        jdbcTemplate.update(
                "INSERT INTO bootstrap_metadata (metadata_key, metadata_value) VALUES (?, ?)",
                BOOTSTRAP_KEY,
                email
        );
    }
}
