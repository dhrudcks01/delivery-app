# 서비스지역 마스터 동기화 가이드 (T-0317, T-0548)

## 목적
- `service_area_master_dongs` 테이블에 대한민국 행정구역(시/구/동) 마스터 데이터를 적재/갱신한다.
- OPS_ADMIN/SYS_ADMIN이 서비스지역을 텍스트 수동 입력 대신 마스터 코드 기준으로 등록할 수 있도록 기준 데이터를 유지한다.

## 데이터 출처
- 행정안전부(국가행정구역코드)에서 제공하는 `법정동코드 전체자료` 텍스트 파일
- 파일 포맷 가정:
  - 탭 구분
  - 1열: 10자리 코드
  - 2열: 주소명(시/도 시/군/구 동/읍/면 ...)
  - 3열: 상태(폐지 여부 포함 가능)

## 동기화 정책
- 기준 테이블: `service_area_master_dongs`
- 적재 정책:
  - 코드 기준 upsert (`ON DUPLICATE KEY UPDATE`)
  - 코드가 같으면 명칭/활성값 갱신
  - 폐지 코드와 동/읍/면/리가 아닌 단위는 적재 제외
- 주의:
  - `V17__create_service_area_master_dongs.sql`의 INSERT 데이터는 개발용 샘플이며 전국 전체 데이터가 아니다.
  - 운영/검증 환경에서는 반드시 전체 원천 파일 기준으로 재적재해야 한다.
- 서비스지역 등록 정책:
  - 코드 기반 등록 시 `service_area_master_dongs`에서 city/district/dong를 조회해 `service_areas`에 upsert
  - `service_areas`에 동일 시/구/동이 이미 있으면 활성화 복구

## 초기 적재 (macOS/Linux)
1. 원천 파일 준비 (예: `tmp/법정동코드_전체자료.txt`)
2. SQL 생성
```bash
bash server/scripts/service-area/generate-master-dong-seed-sql.sh \
  tmp/법정동코드_전체자료.txt \
  tmp/service_area_master_dongs_seed.sql
```
3. MySQL 반영
```bash
mysql -u <USER> -p <DB_NAME> < tmp/service_area_master_dongs_seed.sql
```

## 초기 적재 (Windows PowerShell)
1. 원천 파일 준비 (예: `tmp\법정동코드_전체자료.txt`)
2. SQL 생성
```powershell
powershell -ExecutionPolicy Bypass -File server/scripts/service-area/generate-master-dong-seed-sql.ps1 `
  -InputFile "tmp\법정동코드_전체자료.txt" `
  -OutputFile "tmp\service_area_master_dongs_seed.sql"
```
3. MySQL 반영
```powershell
mysql -u <USER> -p <DB_NAME> < tmp\service_area_master_dongs_seed.sql
```

## 운영 갱신 주기 권장
- 월 1회 정기 갱신 또는 행정구역 개편 공지 시 즉시 갱신
- 갱신 전/후 검증:
  - 총 건수 비교
  - 시/도 개수 비교
  - 임의 표본(시/구/동) 조회 확인
  - OPS_ADMIN `master-dongs` 검색 API 응답 확인

## DB 검증 쿼리 예시
```sql
SELECT COUNT(*) FROM service_area_master_dongs;

SELECT
  COUNT(*) AS total_count,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_count,
  COUNT(DISTINCT city) AS city_count,
  COUNT(DISTINCT CONCAT(city, '|', district)) AS district_count
FROM service_area_master_dongs;

SELECT city, COUNT(*) AS dong_count
FROM service_area_master_dongs
GROUP BY city
ORDER BY city;

SELECT code, city, district, dong, is_active
FROM service_area_master_dongs
WHERE city = '서울특별시'
ORDER BY district, dong
LIMIT 20;
```

## 자동 점검 스크립트
- macOS/Linux
```bash
bash server/scripts/service-area/check-master-dong-health.sh <DB_USER> <DB_NAME> [DB_HOST] [DB_PORT]
```
- Windows PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File server/scripts/service-area/check-master-dong-health.ps1 `
  -DbUser "<DB_USER>" `
  -DbName "<DB_NAME>" `
  -DbHost "127.0.0.1" `
  -DbPort 3306
```
- 기본 최소 기준:
  - `total_count >= 3000`
  - `city_count >= 17`
- 기준 미달 시 종료코드 2로 실패 처리한다.

## API 검증 포인트
- 목록 검색 API:
  - `GET /ops-admin/service-areas/master-dongs?query=서울&page=0&size=20`
- 요약 점검 API (T-0548):
  - `GET /ops-admin/service-areas/master-dongs/summary`
  - 확인 필드:
    - `totalCount`, `activeCount`, `cityCount`, `districtCount`
    - `lowDataWarning` (true면 데이터 부족 가능성 높음)

## 운영 체크리스트 (장애 예방)
1. 신규/복구 배포 후 `master-dongs/summary`에서 `lowDataWarning=false` 확인
2. 서비스 신청지역 UI에서 시/도 검색 시 최소 17개 시/도 노출 확인
3. 주요 도시 표본 검색(서울특별시/부산광역시/대구광역시/인천광역시) 확인
4. 기준 미달이면 즉시 전체 데이터 재적재(원천 파일 -> SQL 생성 -> MySQL 반영)
