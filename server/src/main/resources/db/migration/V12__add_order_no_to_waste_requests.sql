ALTER TABLE waste_requests
    ADD COLUMN order_no VARCHAR(32);

UPDATE waste_requests
SET order_no = CONCAT(
        'WR-',
        CASE
            WHEN id < 1000000 THEN LPAD(id, 6, '0')
            ELSE CONCAT('', id)
            END
               )
WHERE order_no IS NULL;

ALTER TABLE waste_requests
    ADD CONSTRAINT uk_waste_requests_order_no UNIQUE (order_no);
