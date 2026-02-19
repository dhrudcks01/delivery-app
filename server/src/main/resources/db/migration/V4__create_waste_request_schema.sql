CREATE TABLE IF NOT EXISTS waste_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    address VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    note VARCHAR(1000),
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    measured_weight_kg DECIMAL(10,3),
    measured_at TIMESTAMP NULL,
    measured_by_driver_id BIGINT,
    final_amount BIGINT,
    currency VARCHAR(3) NOT NULL DEFAULT 'KRW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_waste_requests_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_waste_requests_measured_by FOREIGN KEY (measured_by_driver_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS waste_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    driver_id BIGINT NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_waste_assignments_request FOREIGN KEY (request_id) REFERENCES waste_requests (id),
    CONSTRAINT fk_waste_assignments_driver FOREIGN KEY (driver_id) REFERENCES users (id),
    CONSTRAINT uk_waste_assignments_request UNIQUE (request_id)
);

CREATE TABLE IF NOT EXISTS waste_status_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_user_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_waste_status_logs_request FOREIGN KEY (request_id) REFERENCES waste_requests (id),
    CONSTRAINT fk_waste_status_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS waste_photos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    url VARCHAR(1000) NOT NULL,
    type VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_waste_photos_request FOREIGN KEY (request_id) REFERENCES waste_requests (id)
);
