# MVP 티켓 백로그 (쓰레기 수거 서비스)

## 사용 규칙 (중요)
- Codex는 작업마다 "티켓 1개"만 수행한다.
- 티켓 범위 밖 변경(리팩토링/추가 기능)은 금지한다. 필요하면 제안만 한다.
- 완료 시 반드시 아래를 출력한다:
  1) 변경된 파일 목록
  2) 실행/검증 방법(명령어)
  3) 주요 설계 및 주의사항 요약
  4) 테스트 추가/실행 결과

---

## 상태 표기
- [ ] TODO
- [~] IN PROGRESS
- [x] DONE

---

# 서비스 MVP 핵심 흐름 (요약)
1) USER: 쓰레기 수거 신청 생성(주소/연락처/요청사항)
2) OPS_ADMIN: 기사 배정(ASSIGNED)
3) DRIVER: 현장 무게 입력 + 사진 업로드(MEASURED)
4) 서버: 요금 계산(무게 기반) → 저장된 카드로 자동 결제 시도
5) 결제 성공: PAID → COMPLETED
6) 결제 실패: PAYMENT_FAILED(운영자 확인/재시도/결제수단 재등록)

---

# EPIC 0) 프로젝트/개발환경

### [x] T-0001 레포 구조 및 README 작성

### [x] T-0002 서버(Spring Boot) 스캐폴딩 생성
**Goal**
- Spring Boot 3 + Java + Gradle 프로젝트 생성

**DoD**
- `/health` 200 응답

---

### [~] T-0003 DB 연결 가이드 문서 (로컬/원격, Docker 없이)
**배경**
- 공개 레포이므로 시크릿/비밀번호 하드코딩 금지

**Goal**
- Windows/Mac에서 Docker 없이 로컬 또는 원격(MySQL) 연결 가능하도록 문서화
- 환경변수(DB_URL/DB_USERNAME/DB_PASSWORD) 방식만 사용

**DoD**
- `docs/dev/mysql-connection.md` 작성
- `.env` 사용 방법(예시 값은 placeholder) + `.gitignore` 확인
- 기존 `docs/dev/mysql-local.md`가 있다면, 내용 정리/통합(선택)

---

### [x] T-0004 Flyway 적용 (초기 마이그레이션)

### [x] T-0005 표준 에러 응답 및 예외 처리

### [x] T-0006 OpenAPI(Swagger) 노출

---

# EPIC 1) 인증 / 계정 / 권한 (RBAC)

### [x] T-0101 DB: users / auth_identities / roles / user_roles

### [x] T-0102 SYS_ADMIN 초기 계정 생성(부트스트랩)
**Goal**
- 로컬에서 SYS_ADMIN 계정으로 로그인 가능

**DoD**
- 운영환경/공개레포 고려: 초기 비밀번호/시크릿은 환경변수 또는 로컬 전용 설정에서만
- 문서로 생성/접속 방법 안내

---

### [x] T-0103 이메일 회원가입 및 로그인 + JWT 발급

### [x] T-0104 Refresh 토큰 재발급
### [x] T-0105 /me (roles 포함)
### [x] T-0106 RBAC 서버 강제 적용
**Goal**
- USER / DRIVER / OPS_ADMIN / SYS_ADMIN 권한 분리

**DoD**
- 권한 없는 요청은 403
- 최소 1개 이상 테스트 포함

---

# EPIC 2) 기사 신청 → 승인 → DRIVER 역할 추가

### [x] T-0201 DB: driver_applications
**Fields**
- user_id
- status (PENDING / APPROVED / REJECTED)
- payload(JSON)
- processed_by
- processed_at

---

### [x] T-0202 USER: 기사 신청 생성 / 조회 API
### [x] T-0203 OPS_ADMIN: 기사 신청 승인 / 반려 API
### [x] T-0204 승인 시 DRIVER 역할 추가 + 감사 로그
### [x] T-0205 SYS_ADMIN: OPS_ADMIN 권한 부여 / 회수

---

# EPIC 3) 쓰레기 수거 요청 / 배정 / 측정

## 상태 정의 (MVP)
- REQUESTED: 사용자 신청 완료
- ASSIGNED: 기사 배정 완료
- MEASURED: 기사 무게 입력 + 사진 업로드 완료
- PAYMENT_PENDING: 결제 시도 중
- PAID: 결제 성공
- COMPLETED: 최종 완료
- PAYMENT_FAILED: 결제 실패(운영자 조치 필요)
- CANCELED: 수거 전 취소(정책: REQUESTED에서만 허용)

---

### [x] T-0301 DB: waste_requests / waste_assignments / waste_status_logs / waste_photos
**Goal**
- “쓰레기 수거” 도메인 중심 테이블 설계

**필수 항목(예시)**
- waste_requests:
  - id, user_id
  - address, contact_phone, note
  - status
  - measured_weight_kg (nullable)
  - measured_at (nullable)
  - measured_by_driver_id (nullable)
  - final_amount (nullable)
  - currency(KRW)
  - created_at, updated_at
- waste_assignments:
  - request_id, driver_id, assigned_at
- waste_status_logs:
  - request_id, from_status, to_status, actor_user_id, created_at
- waste_photos:
  - request_id, url, type(OPTIONAL: TRASH/ SCALE), created_at

**DoD**
- Flyway 마이그레이션 + JPA 엔티티/리포지토리

---

### [x] T-0302 상태 전이 규칙 서버 강제 + 감사로그
**DoD**
- 불가 전이 거절(400 또는 409)
- 전이 시 waste_status_logs 기록(누가/언제/무엇)

---

### [x] T-0303 USER: 쓰레기 수거 신청 생성/내 목록/상세/취소
**Endpoints(예시)**
- POST /waste-requests
- GET /waste-requests (본인)
- GET /waste-requests/{id} (본인)
- POST /waste-requests/{id}/cancel

**DoD**
- 생성: REQUESTED
- 취소: REQUESTED에서만 가능 → CANCELED

---

### [x] T-0304 OPS_ADMIN: 전체 요청 목록/필터/상세
**DoD**
- 상태별 필터(REQUESTED/ASSIGNED/MEASURED/PAYMENT_FAILED 등)
- 기본 페이징/정렬

---

### [x] T-0305 OPS_ADMIN: 기사 배정(ASSIGNED 전이)
**DoD**
- REQUESTED → ASSIGNED 전이
- waste_assignments 생성

---

### [ ] T-0306 DRIVER: 내 배정 목록/상세
**DoD**
- 본인 배정만 조회 가능

---

### [ ] T-0307 사진 업로드 API(최소) + 사진 저장
**Goal**
- DRIVER가 업로드한 사진을 URL로 저장

**DoD**
- POST /uploads (multipart) → URL 반환
- 이미지 확장자/용량 제한
- 개발용: 로컬 저장 OK (운영은 S3 후순위)
- 업로드된 URL을 waste_photos에 저장 가능

---

### [ ] T-0308 DRIVER: 무게 입력 + 사진 업로드 완료 처리(MEASURED 전이)
**Goal**
- 기사님이 현장에서 무게 입력 + 사진 업로드 후 “측정 완료”

**요구**
- measured_weight_kg 입력(소수 가능)
- 사진 1장 이상 필수

**DoD**
- ASSIGNED → MEASURED 전이
- measured_* 필드 저장 + waste_photos 저장

---

### [ ] T-0309 요금 계산 서비스(무게 기반)
**Goal**
- 무게(kg) × 단가(원/kg) = 금액

**DoD**
- MVP 단가 정책:
  - 기본 상수(예: 1000원/kg) 또는 설정값(ENV/DB) 중 택1
- final_amount 계산 및 저장
- 계산 로직 단위테스트 1개 이상

---

# EPIC 4) 결제: 저장카드 등록 + 수거 후 자동 결제 (Toss 기반)

> 주의: 공개 레포에 결제 키/시크릿/카드정보 저장 금지.
> 모든 키는 환경변수로만 관리.

### [ ] T-0401 DB: payment_methods (사용자 저장 결제수단)
**Goal**
- USER당 결제수단 1개 이상 저장

**필드(예시)**
- user_id
- provider(TOSS)
- customer_key (우리 시스템에서 유저 식별용 키)
- billing_key_or_token (저장결제 식별자)
- status(ACTIVE/INACTIVE)
- created_at, updated_at

---

### [ ] T-0402 DB: payments (요청별 결제 기록, 멱등)
**Goal**
- waste_request_id 기준 중복 결제 방지(멱등)

**DoD**
- request_id UNIQUE(또는 provider_order_id UNIQUE)
- status(SUCCEEDED/FAILED/PENDING)
- amount, provider refs 저장

---

### [ ] T-0403 카드 등록 시작/완료(콜백) 플로우(최소)
**Goal**
- 사용자가 “결제 카드 등록”을 1회 수행하면 payment_methods에 저장

**DoD**
- 서버:
  - 카드 등록 시작 endpoint → 등록용 페이지 URL 반환
  - successUrl 콜백 endpoint → payment_methods 저장
  - failUrl endpoint
- 보안:
  - customer_key 생성 규칙 문서화
  - 로그에 키/토큰 노출 금지

---

### [ ] T-0404 MEASURED 이후 자동 결제 실행(서버)
**Goal**
- DRIVER가 측정(MEASURED) 완료하면 서버가 자동 결제 시도

**DoD**
- 흐름:
  - MEASURED 완료 → 요금계산(T-0309) → 결제수단 확인
  - 결제 시도 → 성공: PAID → COMPLETED
  - 실패: PAYMENT_FAILED
- 멱등:
  - 같은 요청에 대해 중복 결제 시도 방지

---

### [ ] T-0405 결제 실패 대응(최소)
**Goal**
- 결제 실패 시 사용자/운영자가 대응 가능

**DoD**
- USER:
  - 결제수단 상태 조회
  - 결제수단 재등록 가능
- OPS_ADMIN:
  - PAYMENT_FAILED 목록 조회
  - 결제 재시도 endpoint(최소)

---

# EPIC 5) 모바일(Expo) - 단일 앱 역할별 UI

### [ ] T-0501 Expo TS 앱 생성 + 네비게이션 구성
### [ ] T-0502 API 클라이언트 + 토큰 저장 + 자동 refresh
### [ ] T-0503 이메일 로그인 UI + /me 기반 역할 분기

## USER
### [ ] T-0504 USER: 수거 신청(생성/목록/상세/취소)
### [ ] T-0505 USER: 결제수단 등록(등록 페이지 WebView 오픈)
### [ ] T-0506 USER: 결제수단 상태/재등록 + 결제 실패 안내

## DRIVER
### [ ] T-0507 DRIVER: 배정 목록/상세
### [ ] T-0508 DRIVER: 무게 입력 + 사진 업로드 + 측정 완료 처리

## OPS_ADMIN / SYS_ADMIN
### [ ] T-0509 OPS_ADMIN: 기사 신청 승인/반려
### [ ] T-0510 OPS_ADMIN: 요청 목록/배정/결제 실패 처리
### [ ] T-0511 SYS_ADMIN: OPS_ADMIN 권한 부여/회수(최소)

---

# EPIC 6) 테스트 및 문서(최소)

### [ ] T-0601 Auth + RBAC 통합 테스트
### [ ] T-0602 상태 전이 테스트(REQUESTED→ASSIGNED→MEASURED→PAID/FAILED)
### [ ] T-0603 요금 계산 단위 테스트
### [ ] T-0604 자동 결제 멱등성 테스트(요청별 1회 결제)
### [ ] T-0605 운영 문서 작성(원격/로컬 DB, 업로드, 결제 실패 대응)

---

# EPIC 7) (추후) 쿠폰/할인 기능 (MVP 이후)

> 이 섹션은 "예정"이며, MVP에서는 구현하지 않는다.

### [ ] T-0701 DB: coupons / user_coupons / coupon_redemptions
### [ ] T-0702 USER: 쿠폰 코드 등록 API
### [ ] T-0703 결제 금액 계산에 쿠폰 할인 반영
### [ ] T-0704 OPS_ADMIN: 쿠폰 생성/비활성화/발급 관리

---
