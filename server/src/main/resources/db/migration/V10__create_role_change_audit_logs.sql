CREATE TABLE IF NOT EXISTS role_change_audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    actor_user_id BIGINT NOT NULL,
    target_user_id BIGINT NOT NULL,
    role_code VARCHAR(30) NOT NULL,
    action VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_role_change_audit_actor_user FOREIGN KEY (actor_user_id) REFERENCES users (id),
    CONSTRAINT fk_role_change_audit_target_user FOREIGN KEY (target_user_id) REFERENCES users (id)
);

CREATE INDEX idx_role_change_audit_created_at ON role_change_audit_logs (created_at);
CREATE INDEX idx_role_change_audit_target_role ON role_change_audit_logs (target_user_id, role_code);
