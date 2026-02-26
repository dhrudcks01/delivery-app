package com.delivery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class FlywayMigrationTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywayAppliesInitialMigrationAndCreatesTable() {
        assertThat(flyway.info().current()).isNotNull();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("15");
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM bootstrap_metadata WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM auth_identities WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM driver_applications WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM waste_requests WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM waste_assignments WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM waste_status_logs WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM waste_photos WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM payment_methods WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT 1 FROM payments WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("SELECT order_no, disposal_items, bag_count FROM waste_requests WHERE 1 = 0"))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("""
                SELECT phone_e164, phone_verified_at, phone_verification_provider, identity_verification_id, ci, di
                FROM users
                WHERE 1 = 0
                """))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("""
                SELECT user_id, identity_verification_id, provider, status, failure_code, failure_message, requested_at, verified_at
                FROM user_phone_verifications
                WHERE 1 = 0
                """))
                .doesNotThrowAnyException();
        assertThatCode(() -> jdbcTemplate.queryForList("""
                SELECT city, district, dong, is_active
                FROM service_areas
                WHERE 1 = 0
                """))
                .doesNotThrowAnyException();
    }
}
