ALTER TABLE payment_methods
    ADD COLUMN method_type VARCHAR(30) NOT NULL DEFAULT 'CARD' AFTER provider;

UPDATE payment_methods
SET method_type = CASE
    WHEN provider = 'KAKAOPAY' THEN 'KAKAOPAY'
    ELSE 'CARD'
END
WHERE method_type IS NULL OR method_type = '';
