# 서비스 지역(동 단위) 매칭 정책

## 목적
- 수거 신청 주소가 도로명/지번/혼합 형태여도 `시/구/동` 화이트리스트로 일관되게 검증되도록 한다.

## 데이터 모델
- 서비스 화이트리스트: `service_areas`
  - `city`, `district`, `dong`, `is_active`
- 행정구역 마스터: `service_area_master_dongs`
  - `code`, `city`, `district`, `dong`, `is_active`

## 최종 매칭 알고리즘 (T-0318)
1. 1차 파싱(로컬 문자열 파싱)
- 입력 주소를 토큰화해 `city/district/dong`를 추출한다.
- 지번 주소(`... 서교동 123-45`), 도로명+동 포함 주소(`... 서교동 월드컵로 1`)는 1차 파싱만으로 처리한다.
- `수원시 장안구` 같이 2단계 구성을 갖는 구역은 `district`를 결합해 처리한다.

2. 2차 보정(주소 검색 API)
- 1차 파싱에서 동 추출 실패 시 주소 검색 API를 호출한다.
- 우선순위:
  - API의 구조화 필드(`city/district/dong`) 사용
  - 구조화 필드가 없으면 API 응답의 `roadAddress`/`jibunAddress`를 다시 파싱
- API 타임아웃/장애 시 매칭 실패와 구분되는 별도 에러코드로 반환한다.

3. 화이트리스트 검증
- 최종 추출된 `city/district/dong` 조합으로 `service_areas.is_active=true` 존재 여부를 확인한다.
- 미존재면 신청을 거부한다.

## 에러 코드 정책
- `SERVICE_AREA_ADDRESS_UNRESOLVED` (400)
  - 주소에서 동까지 판별 실패(1차 파싱 + 2차 보정 모두 실패)
- `SERVICE_AREA_MATCHING_UNAVAILABLE` (502)
  - 주소 보정용 외부 검색 API 사용 불가(타임아웃/연동 장애)
- `SERVICE_AREA_UNAVAILABLE` (400)
  - 동까지는 판별되었지만 서비스 지역 화이트리스트 미등록

## 로그 정책
- 매칭 실패 시 서버 경고 로그(`WARN`)에 실패 사유를 명시한다.
  - `ADDRESS_UNRESOLVED`
  - `NOT_WHITELISTED`
  - `MATCHING_UNAVAILABLE`
- 운영 중 장애 분석 시 실패 사유별로 빠르게 분류 가능하도록 사유 키를 고정한다.

## API 사용 정책
- 관리자(OPS_ADMIN/SYS_ADMIN)
  - 등록: `POST /ops-admin/service-areas`
  - 코드 등록: `POST /ops-admin/service-areas/by-code`
  - 비활성화: `PATCH /ops-admin/service-areas/{serviceAreaId}/deactivate`
  - 조회: `GET /ops-admin/service-areas`, `GET /ops-admin/service-areas/master-dongs`
- 사용자(USER 앱)
  - 조회: `GET /user/service-areas?query=&page=&size=`
  - 사용자 조회는 `is_active=true`만 반환한다.
