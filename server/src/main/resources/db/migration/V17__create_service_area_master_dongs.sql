CREATE TABLE IF NOT EXISTS service_area_master_dongs (
    code VARCHAR(10) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    dong VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_service_area_master_dongs_city_district_dong UNIQUE (city, district, dong)
);

CREATE INDEX idx_service_area_master_dongs_active_city_district_dong
    ON service_area_master_dongs (is_active, city, district, dong);

CREATE INDEX idx_service_area_master_dongs_city_district
    ON service_area_master_dongs (city, district);

-- 운영 시 전체 대한민국 동 단위 적재는 docs/dev/service-area-master-sync.md의 동기화 스크립트를 사용한다.
-- 아래 데이터는 개발/검증용 기본 샘플이다.
INSERT INTO service_area_master_dongs (code, city, district, dong, is_active)
VALUES
    ('1114012000', '서울특별시', '중구', '명동', TRUE),
    ('1144012000', '서울특별시', '마포구', '서교동', TRUE),
    ('1144012200', '서울특별시', '마포구', '합정동', TRUE),
    ('1168010100', '서울특별시', '강남구', '역삼동', TRUE),
    ('1174010900', '서울특별시', '강동구', '천호동', TRUE),
    ('1165010800', '서울특별시', '서초구', '방배동', TRUE),
    ('2611011000', '부산광역시', '중구', '광복동', TRUE),
    ('2714010200', '대구광역시', '동구', '신암동', TRUE),
    ('2817710100', '인천광역시', '미추홀구', '숭의동', TRUE),
    ('3011010200', '대전광역시', '동구', '원동', TRUE),
    ('3111010100', '울산광역시', '중구', '학성동', TRUE),
    ('3611010100', '세종특별자치시', '세종시', '반곡동', TRUE),
    ('4111110100', '경기도', '수원시 장안구', '파장동', TRUE),
    ('4311310400', '충청북도', '청주시 상당구', '북문로1가', TRUE),
    ('4413110200', '충청남도', '천안시 동남구', '원성동', TRUE),
    ('4511110200', '전북특별자치도', '전주시 완산구', '중앙동', TRUE),
    ('4611010300', '전라남도', '목포시', '산정동', TRUE),
    ('4711110100', '경상북도', '포항시 북구', '대흥동', TRUE),
    ('4812110100', '경상남도', '창원시 성산구', '토월동', TRUE),
    ('5011010100', '제주특별자치도', '제주시', '일도일동', TRUE);
