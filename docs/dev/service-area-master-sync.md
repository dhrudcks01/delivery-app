# 서비스지역 마스터 동기화 가이드 (T-0317)

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
  - 임의 표본(시/구/동) 조회 확인
  - OPS_ADMIN `master-dongs` 검색 API 응답 확인

## 검증 쿼리 예시
```sql
SELECT COUNT(*) FROM service_area_master_dongs;

SELECT code, city, district, dong, is_active
FROM service_area_master_dongs
WHERE city = '서울특별시'
ORDER BY district, dong
LIMIT 20;
```
