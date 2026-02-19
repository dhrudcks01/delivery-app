CREATE TABLE IF NOT EXISTS driver_applications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payload JSON NOT NULL,
    processed_by BIGINT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_applications_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_driver_applications_processed_by FOREIGN KEY (processed_by) REFERENCES users (id)
);
