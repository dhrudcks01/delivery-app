CREATE TABLE IF NOT EXISTS service_areas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    dong VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_service_areas_city_district_dong UNIQUE (city, district, dong)
);

CREATE INDEX idx_service_areas_active_city_district_dong
    ON service_areas (is_active, city, district, dong);

