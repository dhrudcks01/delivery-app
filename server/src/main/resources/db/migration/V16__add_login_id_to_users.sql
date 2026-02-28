ALTER TABLE users
    ADD COLUMN login_id VARCHAR(255) NOT NULL DEFAULT '' AFTER id;

UPDATE users
SET login_id = email
WHERE login_id IS NULL OR login_id = '';

ALTER TABLE users
    ADD CONSTRAINT uk_users_login_id UNIQUE (login_id);

ALTER TABLE users
    MODIFY COLUMN email VARCHAR(255) NULL;
