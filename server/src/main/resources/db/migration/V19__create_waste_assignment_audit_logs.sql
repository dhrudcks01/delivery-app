CREATE TABLE IF NOT EXISTS waste_assignment_audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    from_driver_id BIGINT,
    to_driver_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_waste_assignment_audit_logs_request
        FOREIGN KEY (request_id) REFERENCES waste_requests (id),
    CONSTRAINT fk_waste_assignment_audit_logs_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id),
    CONSTRAINT fk_waste_assignment_audit_logs_from_driver
        FOREIGN KEY (from_driver_id) REFERENCES users (id),
    CONSTRAINT fk_waste_assignment_audit_logs_to_driver
        FOREIGN KEY (to_driver_id) REFERENCES users (id)
);
