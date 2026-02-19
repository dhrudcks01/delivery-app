# MVP 티켓 백로그

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

# EPIC 0) 프로젝트/개발환경

### [ ] T-0001 레포 구조 및 README 작성
**Goal**
- `mobile/`, `server/`, `docs/` 기본 구조 생성
- 루트 README 작성

**DoD**
- 각 폴더가 독립 실행 가능
- README에 실행 방법 명시

---

### [~] T-0002 서버(Spring Boot) 스캐폴딩 생성
**Goal**
- Spring Boot 3 + Java 17 + Gradle 프로젝트 생성

**Include**
- Web
- Validation
- Security
- OAuth2 Client
- JPA
- Flyway
- MySQL Driver
- Lombok
- (선택) OpenAPI

**DoD**
- `./gradlew bootRun` 실행 시 서버 정상 기동
- `/health` 엔드포인트 200 응답

---

### [x] T-0003 로컬 MySQL 개발 가이드 작성 (Docker 없이)
**Goal**
- Windows/Mac 모두 로컬 MySQL 설치 기반 실행 가능하도록 문서 작성

**DoD**
- `docs/dev/mysql-local.md` 작성
- 설치 방법 / DB 생성 / 접속 검증 절차 포함

---

### [x] T-0004 Flyway 적용 (초기 마이그레이션)
**Goal**
- 빈 DB에서도 서버 기동 시 테이블 자동 생성

**DoD**
- Flyway 정상 적용
- 실패 시 에러 원인 명확

---

### [x] T-0005 표준 에러 응답 및 예외 처리
**Goal**
- Validation/401/403/500 응답 포맷 통일

**DoD**
- 공통 에러 DTO 작성
- 글로벌 예외 핸들러 적용

---

### [x] T-0006 OpenAPI(Swagger) 노출
**Goal**
- API 문서 확인 가능

**DoD**
- 로컬에서 Swagger UI 접속 가능

---

# EPIC 1) 인증 / 계정 / 권한 (RBAC)

### [x] T-0101 DB: users / auth_identities / roles / user_roles
**Goal**
- 멀티 롤 + 멀티 로그인 프로바이더 기반 스키마 구성

**DoD**
- Flyway 적용
- UNIQUE(provider, provider_user_id) 제약 설정

---

### [ ] T-0102 SYS_ADMIN 초기 계정 생성
**Goal**
- 초기 운영을 위한 SYS_ADMIN 계정 생성

**DoD**
- 로컬에서 SYS_ADMIN 로그인 가능

---

### [ ] T-0103 이메일 회원가입 및 로그인 + JWT 발급
**Endpoints**
- POST /auth/register
- POST /auth/login

**DoD**
- 비밀번호 해시 저장
- access / refresh 토큰 발급

---

### [ ] T-0104 Refresh 토큰 재발급
**Endpoint**
- POST /auth/refresh

**DoD**
- 만료 시 재발급
- 위조 또는 불일치 시 401 처리

---

### [ ] T-0105 /me (roles 포함)
**Endpoint**
- GET /me

**DoD**
- roles 배열 포함 응답

---

### [ ] T-0106 RBAC 서버 강제 적용
**Goal**
- USER / DRIVER / OPS_ADMIN / SYS_ADMIN 권한 분리

**DoD**
- 권한 없는 요청은 403
- 최소 1개 이상 테스트 포함

---

### [ ] T-0107 소셜 로그인 공통 구조 (Strategy 패턴)
**Goal**
- KAKAO / GOOGLE / APPLE 확장 가능 구조 설계

**DoD**
- provider별 구현체 추가 가능

---

### [ ] T-0108 카카오 로그인 (서버)
**DoD**
- 카카오 로그인으로 가입/로그인
- JWT 발급

---

### [ ] T-0109 구글 로그인 (서버)
**DoD**
- 구글 로그인으로 가입/로그인
- JWT 발급

---

### [ ] T-0110 애플 로그인 (서버)
**DoD**
- 애플 로그인으로 가입/로그인
- JWT 발급

---

### [ ] T-0111 계정 삭제 API
**Goal**
- 스토어 정책 대응

**DoD**
- 개인정보 삭제 또는 비활성화 처리

---

# EPIC 2) 기사 신청 → 승인 → 역할 추가

### [ ] T-0201 DB: driver_applications
**Fields**
- user_id
- status (PENDING / APPROVED / REJECTED)
- payload
- processedBy
- processedAt

**DoD**
- 테이블 + 엔티티 + 리포지토리 구현

---

### [ ] T-0202 USER: 기사 신청 생성 / 조회
**DoD**
- 본인 신청 생성 가능
- 본인 신청 조회 가능

---

### [ ] T-0203 OPS_ADMIN: 기사 신청 승인 / 반려
**DoD**
- 승인/반려 처리
- 처리자 및 처리 시각 기록

---

### [ ] T-0204 승인 시 DRIVER 역할 추가
**DoD**
- 승인 시 user_roles에 DRIVER 추가
- 기존 USER 유지

---

### [ ] T-0205 SYS_ADMIN: OPS_ADMIN 권한 부여 / 회수
**DoD**
- SYS_ADMIN만 수행 가능

---

# EPIC 3) 수거 신청 / 배정 / 처리

### [ ] T-0301 DB: pickup_requests / assignments / pickup_status_logs
**DoD**
- 상태 / 배정 / 이력 분리 저장

---

### [ ] T-0302 상태 전이 규칙 서버 강제
**DoD**
- 불가 전이 거절 (400 또는 409)
- 전이 시 로그 기록

---

### [ ] T-0303 USER: 수거 신청 생성
**DoD**
- 생성 시 REQUESTED 상태
- 입력 Validation 포함

---

### [ ] T-0304 USER: 내 수거 목록 / 상세
**DoD**
- 본인만 조회 가능
- 기본 페이징 / 정렬

---

### [ ] T-0305 USER: 결제 전 취소
**DoD**
- REQUESTED / PAYMENT_PENDING 상태에서만 가능

---

### [ ] T-0306 OPS_ADMIN: 전체 수거 목록 조회
**DoD**
- 상태별 필터 가능

---

### [ ] T-0307 OPS_ADMIN: 기사 배정
**DoD**
- 정책 상태에서만 ASSIGNED 전이
- driverId 연결

---

### [ ] T-0308 DRIVER: 내 배정 목록 조회
**DoD**
- 본인 배정만 조회

---

### [ ] T-0309 DRIVER: 수거 완료 처리
**DoD**
- ASSIGNED → PICKED_UP 전이 가능

---

### [ ] T-0310 OPS_ADMIN: 최종 완료 처리
**DoD**
- PICKED_UP → COMPLETED 전이 가능

---

# EPIC 4) 결제 (Toss Payments)

### [ ] T-0401 DB: payments (orderId UNIQUE)
**DoD**
- orderId 멱등성 보장

---

### [ ] T-0402 결제 주문 생성 API
**Endpoint**
- POST /payments/toss/create

**DoD**
- orderId 생성
- PAYMENT_PENDING 전이
- checkoutUrl 반환

---

### [ ] T-0403 결제 페이지 최소 구현 (web-pay)
**DoD**
- orderId / amount 기반 결제 시작 가능

---

### [ ] T-0404 successUrl 처리 (서버 승인 Confirm)
**DoD**
- amount 위변조 검증
- 승인 성공 시 payment=PAID
- pickup=PAID 전이

---

### [ ] T-0405 failUrl 처리
**DoD**
- payment=FAILED 처리

---

### [ ] T-0406 웹훅 엔드포인트 + 멱등 처리
**DoD**
- 중복 이벤트 안전 처리

---

### [ ] T-0407 로컬 웹훅 테스트 문서 (ngrok)
**DoD**
- `docs/dev/toss-webhook-local.md` 작성

---

# EPIC 5) 모바일 (Expo)

### [ ] T-0501 Expo TS 앱 생성 + 네비게이션 구성
### [ ] T-0502 API 클라이언트 + 토큰 저장 + 자동 refresh
### [ ] T-0503 이메일 로그인 UI
### [ ] T-0504 카카오 로그인
### [ ] T-0505 구글 로그인
### [ ] T-0506 애플 로그인 (iOS)
### [ ] T-0507 역할 기반 라우팅
### [ ] T-0508 USER 수거 신청 화면
### [ ] T-0509 USER 결제 WebView 연결
### [ ] T-0510 DRIVER 배정 화면
### [ ] T-0511 OPS_ADMIN 승인 화면
### [ ] T-0512 OPS_ADMIN 배정 화면
### [ ] T-0513 SYS_ADMIN 권한 관리 화면
### [ ] T-0514 설정 (로그아웃 / 계정삭제)

---

# EPIC 6) 테스트 및 문서

### [ ] T-0601 Auth + RBAC 통합 테스트
### [ ] T-0602 상태 전이 테스트
### [ ] T-0603 토스 승인 Mock 테스트
### [ ] T-0604 운영 문서 작성
