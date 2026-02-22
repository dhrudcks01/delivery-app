CREATE TABLE IF NOT EXISTS login_audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    login_identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    user_agent VARCHAR(500) NOT NULL,
    result VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_audit_logs_created_at ON login_audit_logs (created_at);
CREATE INDEX idx_login_audit_logs_result ON login_audit_logs (result);
CREATE INDEX idx_login_audit_logs_login_identifier ON login_audit_logs (login_identifier);
