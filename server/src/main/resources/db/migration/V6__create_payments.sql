CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    waste_request_id BIGINT NOT NULL,
    payment_method_id BIGINT,
    provider VARCHAR(30) NOT NULL,
    provider_order_id VARCHAR(191) NOT NULL,
    provider_payment_key VARCHAR(191),
    status VARCHAR(20) NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KRW',
    failure_code VARCHAR(100),
    failure_message VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_waste_request FOREIGN KEY (waste_request_id) REFERENCES waste_requests (id),
    CONSTRAINT fk_payments_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id),
    CONSTRAINT uk_payments_waste_request UNIQUE (waste_request_id),
    CONSTRAINT uk_payments_provider_order_id UNIQUE (provider_order_id)
);

CREATE INDEX idx_payments_status ON payments (status);
