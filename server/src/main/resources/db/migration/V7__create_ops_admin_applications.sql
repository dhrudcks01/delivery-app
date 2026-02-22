CREATE TABLE IF NOT EXISTS ops_admin_applications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(500) NOT NULL,
    processed_by BIGINT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ops_admin_applications_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_ops_admin_applications_processed_by FOREIGN KEY (processed_by) REFERENCES users (id)
);
