ALTER TABLE users
    ADD COLUMN phone_e164 VARCHAR(20),
    ADD COLUMN phone_verified_at TIMESTAMP NULL,
    ADD COLUMN phone_verification_provider VARCHAR(30),
    ADD COLUMN identity_verification_id VARCHAR(120),
    ADD COLUMN ci VARBINARY(512),
    ADD COLUMN di VARBINARY(512);

ALTER TABLE users
    ADD CONSTRAINT uk_users_identity_verification_id UNIQUE (identity_verification_id);

CREATE TABLE IF NOT EXISTS user_phone_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    identity_verification_id VARCHAR(120) NOT NULL,
    provider VARCHAR(30) NOT NULL,
    phone_e164 VARCHAR(20),
    status VARCHAR(30) NOT NULL,
    failure_code VARCHAR(100),
    failure_message VARCHAR(500),
    ci VARBINARY(512),
    di VARBINARY(512),
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_phone_verifications_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_user_phone_verifications_identity_verification_id UNIQUE (identity_verification_id)
);

CREATE INDEX idx_user_phone_verifications_user_created_at
    ON user_phone_verifications (user_id, created_at DESC);

CREATE INDEX idx_user_phone_verifications_user_status
    ON user_phone_verifications (user_id, status);
