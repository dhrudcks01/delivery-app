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

### [ ] T-0107 백엔드 API 공통 요청/응답 로그(운영용)
**Goal**
- 전체 API 호출에 대해 추적 가능한 공통 로그를 남긴다.

**DoD**
- 요청 단위 `requestId` 생성/전파(MDC)
- 요청 메서드/URI/상태코드/처리시간(ms)/클라이언트 IP 로그 출력
- 인증된 요청은 userId/email(가능한 범위) 포함
- 민감정보(비밀번호/토큰/카드관련 값) 마스킹 또는 로그 제외

---

### [ ] T-0108 사용자 접속 기록(로그인 성공/실패) 저장
**Goal**
- 사용자 접속 이력을 DB에 저장해 운영 추적이 가능하도록 한다.

**DoD**
- DB: 접속기록 테이블(Flyway) 추가
- 로그인 성공/실패 시각, 식별자(email), IP, User-Agent, 결과를 저장
- 조회 API는 최소 OPS_ADMIN/SYS_ADMIN용으로 제공(페이징)
- 개인정보 최소수집 원칙 준수(필요 필드만 저장)

---

### [ ] T-0109 카카오 OAuth 로그인(서버)
**Goal**
- 카카오 계정으로 로그인/회원가입이 가능하도록 서버 플로우를 제공한다.

**DoD**
- OAuth 시작/콜백 endpoint 구현
- 카카오 사용자 식별값을 `auth_identities(provider=KAKAO)`에 저장
- 기존 이메일 계정과 충돌 정책 정의 및 처리
- JWT(Access/Refresh) 발급까지 기존 로그인 흐름과 동일하게 동작

---

### [ ] T-0110 구글 OAuth 로그인(서버)
**Goal**
- 구글 계정으로 로그인/회원가입이 가능하도록 서버 플로우를 제공한다.

**DoD**
- OAuth 시작/콜백 endpoint 구현
- 구글 사용자 식별값을 `auth_identities(provider=GOOGLE)`에 저장
- 기존 이메일 계정과 충돌 정책 정의 및 처리
- JWT(Access/Refresh) 발급까지 기존 로그인 흐름과 동일하게 동작

---

### [x] T-0111 로그인 식별자 검증 완화(email 전용 -> string)
**Goal**
- 로그인 식별자를 이메일 형식에 고정하지 않고 일반 문자열로 받아 인증 가능하게 한다.

**DoD**
- `/auth/login` 요청 DTO에서 email 형식 강제 검증 제거
- 인증 조회 키 정책 정리(예: email 컬럼을 문자열 식별자로 사용)
- 기존 계정 로그인 호환성 유지
- 실패 응답/에러 메시지 규칙 기존 포맷 유지

---

### [x] T-0112 도로명 주소 검색 API 연동(서버)
**Goal**
- 모바일에서 주소 검색 시 사용할 수 있도록 서버에 도로명 주소 검색 API 연동 endpoint를 제공한다.

**DoD**
- 외부 주소 API 연동용 서비스/설정값(키/URL) 추가
- 검색어 기반 주소 검색 endpoint 제공(페이징 또는 개수 제한 포함)
- 장애/타임아웃 시 표준 에러 응답으로 처리
- API 키/시크릿은 환경변수로만 관리

---

### [x] T-0113 회원가입 식별자 검증 완화(email 전용 -> string)
**Goal**
- 회원가입 식별자를 이메일 형식에 고정하지 않고 일반 문자열(ID)로 가입 가능하게 한다.

**DoD**
- `/auth/register` 요청 DTO에서 email 형식 강제 검증 제거
- 식별자 중복 검증 정책 유지(기존 사용자와 충돌 방지)
- 기존 이메일 기반 계정과 로그인 호환성 유지
- 모바일 회원가입 화면 검증 규칙도 문자열 식별자 정책과 일치

---

### [x] T-0114 로그인 실패 사유 분리(ID 없음 / 비밀번호 불일치)
**Goal**
- 로그인 실패 원인을 운영/사용자 안내 관점에서 구분 가능하게 한다.

**DoD**
- ID 미존재와 비밀번호 불일치 케이스를 서버에서 분리 처리
- 표준 에러 포맷을 유지하면서 코드/메시지 구분
- 모바일 로그인 화면에서 분리된 에러 메시지 노출
- 로그인 실패 이력 저장 정책(T-0108)과 충돌 없도록 정리

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

### [x] T-0206 OPS_ADMIN 기사신청 승인 UX 개선(신청 목록 기반)
**Goal**
- 관리자가 신청 ID를 수동 입력하지 않고, 대기 신청 목록에서 선택해 승인/반려할 수 있게 한다.

**DoD**
- 서버: 기사 신청 목록 조회 API에 상태/정렬/페이징 기준 명확화
- 승인/반려 처리 응답에 처리자/처리시각 포함
- ID 직접입력 없이도 승인 가능한 UI 연동을 고려한 응답 구조 정리

---

### [x] T-0207 OPS_ADMIN 권한 신청/승인 플로우(OPS_ADMIN_REQUEST)
**Goal**
- 사용자(또는 DRIVER)가 OPS_ADMIN 권한을 신청하고 SYS_ADMIN이 승인/반려하는 절차를 추가한다.

**DoD**
- DB: ops_admin_applications(신청자/상태/처리자/처리시각/사유) 테이블 추가
- USER/DRIVER: OPS_ADMIN 권한 신청 API 제공
- SYS_ADMIN: OPS_ADMIN 권한 신청 목록/승인/반려 API 제공
- 승인 시 user_roles에 OPS_ADMIN 추가, 감사로그 기록

---

### [x] T-0208 SYS_ADMIN 권한 신청/승인 플로우(SYS_ADMIN_REQUEST)
**Goal**
- SYS_ADMIN 권한도 직접 ID 부여가 아닌 신청 기반 승인 절차로 관리한다.

**DoD**
- DB: sys_admin_applications(신청자/상태/처리자/처리시각/사유) 테이블 추가
- OPS_ADMIN(또는 정책상 허용된 역할): SYS_ADMIN 권한 신청 API 제공
- SYS_ADMIN: 신청 목록/승인/반려 API 제공(자기승인 방지 규칙 포함)
- 승인 시 user_roles에 SYS_ADMIN 추가, 처리 이력 감사로그 기록

---

### [ ] T-0209 DRIVER 권한 신청/승인 정책 정렬(USER 신청 + OPS_ADMIN/SYS_ADMIN 승인)
**Goal**
- USER 계정이 DRIVER 권한을 신청하고, OPS_ADMIN 또는 SYS_ADMIN이 승인/반려할 수 있도록 정책을 명확히 반영한다.

**DoD**
- DRIVER 신청 승인 권한에 SYS_ADMIN 포함(OPS_ADMIN 외 승인 가능)
- 승인 시 `user_roles`에 DRIVER 추가(기존 USER 유지)
- 승인/반려 처리자 역할(OPS_ADMIN/SYS_ADMIN) 및 처리시각 감사로그 기록
- 모바일 권한 신청/승인 화면 정책 문구 일치

---

### [ ] T-0210 OPS_ADMIN 권한 부여 대상 검색/선택 정책(대상: DRIVER)
**Goal**
- OPS_ADMIN이 DRIVER 계정을 검색해 OPS_ADMIN 권한을 부여할 수 있도록 대상 제한 정책을 반영한다.

**DoD**
- OPS_ADMIN 권한 부여 대상 조회 API 제공(검색어/페이징)
- 대상 조건: DRIVER 권한 보유 + OPS_ADMIN 미보유
- 권한 부여/회수 처리 시 감사로그 기록
- 모바일(또는 운영 UI)에서 검색 기반 선택 부여 동선 제공

---

### [ ] T-0211 SYS_ADMIN 권한 부여 대상 검색/선택 정책(대상: 비 SYS_ADMIN)
**Goal**
- SYS_ADMIN이 SYS_ADMIN이 아닌 계정을 검색해 SYS_ADMIN 권한을 부여할 수 있도록 한다.

**DoD**
- SYS_ADMIN 권한 부여 대상 조회 API 제공(검색어/페이징)
- 대상 조건: SYS_ADMIN 미보유 계정
- 자기 자신 부여/회수 등 금지 정책 명시 및 검증
- 권한 변경 시 감사로그 기록 + 모바일(또는 운영 UI) 검색 기반 선택 동선 제공

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

### [x] T-0306 DRIVER: 내 배정 목록/상세
**DoD**
- 본인 배정만 조회 가능

---

### [x] T-0307 사진 업로드 API(최소) + 사진 저장
**Goal**
- DRIVER가 업로드한 사진을 URL로 저장

**DoD**
- POST /uploads (multipart) → URL 반환
- 이미지 확장자/용량 제한
- 개발용: 로컬 저장 OK (운영은 S3 후순위)
- 업로드된 URL을 waste_photos에 저장 가능

---

### [x] T-0308 DRIVER: 무게 입력 + 사진 업로드 완료 처리(MEASURED 전이)
**Goal**
- 기사님이 현장에서 무게 입력 + 사진 업로드 후 “측정 완료”

**요구**
- measured_weight_kg 입력(소수 가능)
- 사진 1장 이상 필수

**DoD**
- ASSIGNED → MEASURED 전이
- measured_* 필드 저장 + waste_photos 저장

---

### [x] T-0309 요금 계산 서비스(무게 기반)
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

### [x] T-0401 DB: payment_methods (사용자 저장 결제수단)
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

### [x] T-0402 DB: payments (요청별 결제 기록, 멱등)
**Goal**
- waste_request_id 기준 중복 결제 방지(멱등)

**DoD**
- request_id UNIQUE(또는 provider_order_id UNIQUE)
- status(SUCCEEDED/FAILED/PENDING)
- amount, provider refs 저장

---

### [x] T-0403 카드 등록 시작/완료(콜백) 플로우(최소)
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

### [x] T-0404 MEASURED 이후 자동 결제 실행(서버)
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

### [x] T-0405 결제 실패 대응(최소)
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

### [x] T-0501 Expo TS 앱 생성 + 네비게이션 구성
### [x] T-0502 API 클라이언트 + 토큰 저장 + 자동 refresh
### [x] T-0503 이메일 로그인 UI + /me 기반 역할 분기

## USER
### [x] T-0504 USER: 수거 신청(생성/목록/상세/취소)
### [x] T-0505 USER: 결제수단 등록(등록 페이지 WebView 오픈)
### [x] T-0506 USER: 결제수단 상태/재등록 + 결제 실패 안내

## DRIVER
### [x] T-0507 DRIVER: 배정 목록/상세
### [x] T-0508 DRIVER: 무게 입력 + 사진 업로드 + 측정 완료 처리

## OPS_ADMIN / SYS_ADMIN
### [x] T-0509 OPS_ADMIN: 기사 신청 승인/반려
### [x] T-0510 OPS_ADMIN: 요청 목록/배정/결제 실패 처리
### [x] T-0511 SYS_ADMIN: OPS_ADMIN 권한 부여/회수(최소)
### [x] T-0512 모바일 UI/UX 개선(오늘수거 벤치마크, 로그인 UX 포함)
**Goal**
- 모바일 전반 화면을 MVP 수준에서 사용성이 높은 UI로 개선
- 디자인 방향은 오늘수거 앱 UX를 참고하되, 현재 기능 흐름(USER/DRIVER/OPS_ADMIN/SYS_ADMIN)은 유지

**DoD**
- 로그인 화면:
  - 키보드 오픈 시 입력창(특히 비밀번호)이 가려지지 않도록 개선(KeyboardAvoiding/스크롤 동작 포함)
  - 로그인 실패 시 email 입력값은 유지되고, 비밀번호만 재입력 가능
- 역할별 홈 화면(최소 USER/DRIVER/OPS_ADMIN/SYS_ADMIN) 공통 UI 톤/간격/버튼 스타일 정리
- 모바일에서 로딩/에러/성공 피드백 가시성 개선(문구/배치/대비)
- 기능 동작 변경 없이 UI/UX만 개선

### [x] T-0513 모바일 회원가입 화면 + 가입 플로우
**Goal**
- 앱에서 이메일 회원가입을 완료하고 바로 로그인 상태로 진입한다.

**DoD**
- 회원가입 화면(이메일/비밀번호/이름) 추가
- 입력 검증/에러 메시지/로딩 처리
- 가입 성공 시 토큰 저장 및 역할 분기 화면 진입
- 로그인 화면에서 회원가입 화면으로 이동 동선 제공

---

### [ ] T-0514 모바일 카카오 로그인 화면/연동
**Goal**
- 앱에서 카카오 로그인 버튼을 통해 서버 OAuth 플로우를 수행한다.

**DoD**
- 로그인 화면에 카카오 로그인 CTA 추가
- WebView 또는 브라우저 딥링크 기반 OAuth 완료 처리
- 로그인 성공 시 토큰 저장 및 역할 분기 화면 진입
- 실패/취소 시 사용자 피드백 제공

---

### [ ] T-0515 모바일 구글 로그인 화면/연동
**Goal**
- 앱에서 구글 로그인 버튼을 통해 서버 OAuth 플로우를 수행한다.

**DoD**
- 로그인 화면에 구글 로그인 CTA 추가
- WebView 또는 브라우저 딥링크 기반 OAuth 완료 처리
- 로그인 성공 시 토큰 저장 및 역할 분기 화면 진입
- 실패/취소 시 사용자 피드백 제공

---

### [x] T-0516 모바일 역할 기반 화면 진입 구조 개편(하단 탭 최소화)
**Goal**
- 단일 권한 사용자(USER only)는 USER 화면만 보이도록 하고, 불필요한 하단 선택 탭을 제거한다.

**DoD**
- USER only 계정 로그인 시 USER 홈만 노출(탭 선택 UI 미노출)
- DRIVER 권한 포함 계정은 DRIVER 배정 화면 진입 동선 명확화
- 멀티 권한 계정(예: DRIVER+OPS_ADMIN)은 정책에 따른 진입/전환 UX 정의 및 반영
- 기존 API 기능 동작은 유지하고 네비게이션 구조만 개선

---

### [x] T-0517 DRIVER 전용 배정건 화면 분리/강화
**Goal**
- DRIVER 권한 사용자가 배정받은 건을 빠르게 확인/처리할 수 있는 전용 화면 흐름을 강화한다.

**DoD**
- 배정 목록/상세/측정 완료 액션을 DRIVER 전용 화면으로 정리
- 사용자(USER) 화면과 정보/액션 혼재되지 않도록 분리
- 배정건 상태별 필터 또는 우선순위 표시(최소 1개) 추가

---

### [x] T-0518 USER 신청 화면 도로명 주소 검색 연동
**Goal**
- 수거 신청 시 수동 입력 대신 도로명 주소 검색으로 주소를 선택/입력할 수 있게 한다.

**DoD**
- USER 신청 화면에 주소 검색 입력/결과 리스트 UI 추가
- 서버 주소검색 endpoint(T-0112)와 연동
- 선택한 주소를 신청 폼에 반영(주소 상세 입력칸 분리 포함)
- 검색 로딩/빈 결과/오류 상태 UX 제공

---

### [x] T-0519 OPS_ADMIN 기사신청 승인 화면 개편(목록 선택형)
**Goal**
- 관리자가 기사 신청을 ID 수동 입력 없이 신청 카드/목록에서 선택해 승인/반려하도록 UI를 개선한다.

**DoD**
- OPS_ADMIN 화면에 PENDING 기사신청 목록 표시
- 신청 상세 정보 확인 후 승인/반려 액션 제공
- 처리 완료 항목은 목록에서 즉시 상태 갱신
- 기존 수동 ID 입력 UI 제거 또는 후순위 숨김

---

### [x] T-0520 권한 신청 화면(OPS_ADMIN/SYS_ADMIN) 및 승인 화면
**Goal**
- 권한 부여 기능을 신청 기반으로 바꾸고, 모바일에서 신청/승인 화면을 제공한다.

**DoD**
- USER/DRIVER: OPS_ADMIN 권한 신청 화면 제공
- 정책 허용 역할: SYS_ADMIN 권한 신청 화면 제공
- SYS_ADMIN: OPS_ADMIN/SYS_ADMIN 신청 목록, 승인/반려 UI 제공
- 상태값(PENDING/APPROVED/REJECTED) 및 처리 이력 표시


---

# EPIC 6) 테스트 및 문서(최소)

### [x] T-0601 Auth + RBAC 통합 테스트
### [x] T-0602 상태 전이 테스트(REQUESTED→ASSIGNED→MEASURED→PAID/FAILED)
### [x] T-0603 요금 계산 단위 테스트
### [x] T-0604 자동 결제 멱등성 테스트(요청별 1회 결제)
### [x] T-0605 운영 문서 작성(원격/로컬 DB, 업로드, 결제 실패 대응)

---

# EPIC 7) (추후) 쿠폰/할인 기능 (MVP 이후)

> 이 섹션은 "예정"이며, MVP에서는 구현하지 않는다.

### [ ] T-0701 DB: coupons / user_coupons / coupon_redemptions
### [ ] T-0702 USER: 쿠폰 코드 등록 API
### [ ] T-0703 결제 금액 계산에 쿠폰 할인 반영
### [ ] T-0704 OPS_ADMIN: 쿠폰 생성/비활성화/발급 관리

---
