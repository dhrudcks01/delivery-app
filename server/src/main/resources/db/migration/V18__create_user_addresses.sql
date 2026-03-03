CREATE TABLE IF NOT EXISTS user_addresses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    road_address VARCHAR(255) NOT NULL,
    jibun_address VARCHAR(255),
    zip_code VARCHAR(20),
    detail_address VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    primary_marker TINYINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_addresses_primary_per_user UNIQUE (user_id, primary_marker)
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses (user_id);
CREATE INDEX idx_user_addresses_user_created_at ON user_addresses (user_id, created_at);
