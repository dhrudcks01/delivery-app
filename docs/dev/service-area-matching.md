# 서비스 지역(동 단위) 매칭 정책

## 목적
- 수거 신청 가능 지역을 `시/구/동` 단위 화이트리스트로 관리한다.
- 앱은 화이트리스트 조회 API로 서비스 가능 지역 목록을 검색/표시한다.

## 데이터 모델
- 테이블: `service_areas`
- 필드:
  - `city` (시/도)
  - `district` (시/군/구)
  - `dong` (행정동)
  - `is_active` (활성 여부)

## 주소 매칭 기준(도로명주소 -> 동 단위)
- 도로명주소 검색 결과(예: Juso)의 행정구역 필드에서 `시/도`, `시/군/구`, `읍/면/동` 값을 추출한다.
- 서비스 가능 여부 판단 시 정규화된 `시/도 + 시/군/구 + 동` 조합을 화이트리스트와 비교한다.
- MVP 단계에서는 문자열 정규화(앞뒤 공백 제거)까지만 적용하고, 상세 행정동 표준화(법정동/행정동 맵핑)는 후속 티켓에서 확장한다.

## API 사용 정책
- 관리자(OPS_ADMIN/SYS_ADMIN)
  - 등록: `POST /ops-admin/service-areas`
  - 비활성화: `PATCH /ops-admin/service-areas/{serviceAreaId}/deactivate`
  - 조회: `GET /ops-admin/service-areas?query=&active=&page=&size=`
- 사용자(USER 앱)
  - 조회: `GET /user/service-areas?query=&page=&size=`
  - 사용자 조회는 `is_active=true` 데이터만 반환한다.

