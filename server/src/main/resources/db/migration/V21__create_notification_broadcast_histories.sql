CREATE TABLE IF NOT EXISTS notification_broadcast_histories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    actor_user_id BIGINT NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_user_ids_json TEXT NULL,
    category VARCHAR(20) NOT NULL,
    title VARCHAR(120) NOT NULL,
    message VARCHAR(500) NOT NULL,
    scheduled_at TIMESTAMP NULL,
    executed_at TIMESTAMP NULL,
    result_status VARCHAR(20) NOT NULL,
    target_count INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_broadcast_histories_actor_user
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX idx_notification_broadcast_histories_actor_created
    ON notification_broadcast_histories (actor_user_id, created_at DESC);
CREATE INDEX idx_notification_broadcast_histories_result_status
    ON notification_broadcast_histories (result_status, created_at DESC);
