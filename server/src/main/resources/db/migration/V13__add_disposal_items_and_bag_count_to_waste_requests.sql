ALTER TABLE waste_requests
    ADD COLUMN disposal_items TEXT;

ALTER TABLE waste_requests
    ADD COLUMN bag_count INT NOT NULL DEFAULT 0;

UPDATE waste_requests
SET disposal_items = '[]'
WHERE disposal_items IS NULL;
