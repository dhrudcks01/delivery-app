# CONSTRAINTS (MVP Non‑Negotiables)

이 문서는 "절대 조건"이다. Codex는 작업 시작 전 반드시 읽고, 아래 조건을 위반하는 변경은 하지 않는다.

## 0. 목표
- 단일 모바일 앱(코드베이스 1개)으로 iOS(App Store) + Android(Google Play) 동시 배포 가능한 MVP 구현
- 택배 수거 신청 + 결제(토스) + 기사 배정/처리 + 관리자(운영/시스템) 권한 분리

---

## 1. 기술 스택 고정
### Mobile
- Expo (React Native) + TypeScript
- 단일 앱에서 USER/DRIVER/OPS_ADMIN/SYS_ADMIN 역할별 화면 분기

### Backend
- Spring Boot 3, Java 17, Gradle
- REST API
- 인증: JWT Access/Refresh

### Database
- MySQL (InnoDB, utf8mb4)
- 로컬 개발은 **Docker 필수 아님** (Windows/Mac 모두 로컬 설치로 개발 가능해야 함)
- 스키마/마이그레이션: Flyway 사용

### Payment
- Toss Payments 연동
- 결제 성공 리다이렉트(successUrl)에서 받은 값으로 서버가 "결제 승인(Confirm)"을 호출해 최종 확정
- Webhook 엔드포인트 제공 및 멱등 처리(중복 이벤트 안전)

### Auth / Social Login
- 이메일 회원가입/로그인
- 카카오 OAuth 로그인
- 구글 OAuth 로그인
- iOS 심사 리스크 최소화를 위해 Apple 로그인 포함(권장, 실제 운영에서는 사실상 필수 가능성 큼)

---

## 2. 권한/역할 모델 고정 (멀티 롤)
- USER: 일반 사용자
- DRIVER: 기사 역할
- OPS_ADMIN: 운영관리자(기사 승인/배정/운영 기능)
- SYS_ADMIN: 시스템 관리자(역할 부여/회수, 운영자 임명 등)

중요:
- "계정 전환"이 아니라 한 user가 여러 role을 가질 수 있어야 한다(user_roles).
- 예: 승인 권한 있는 기사는 DRIVER + OPS_ADMIN을 동시에 가질 수 있다.

---

## 3. 기사 신청 → 승인 플로우 고정
- USER는 기사 신청(driver_applications)을 생성할 수 있다.
- OPS_ADMIN은 신청을 승인/반려할 수 있다.
- 승인 시 user_roles에 DRIVER를 추가한다(기존 USER 유지).
- 누가 언제 처리했는지 감사 로그(처리자/처리시각)는 반드시 남긴다.

---

## 4. 수거(Pickup) 상태 모델 (MVP)
최소 상태:
- REQUESTED
- PAYMENT_PENDING
- PAID
- ASSIGNED
- PICKED_UP
- COMPLETED
- CANCELED (MVP: 결제 전 취소만 허용)
- (옵션/후순위) REFUNDED

규칙:
- 상태 전이는 서버에서 강제(Validation). 불가 전이는 400 또는 409로 거절.
- 상태 변경 시 status log를 남긴다(누가, 언제, 무엇을).

---

## 5. 보안/운영 원칙
- RBAC는 "앱 화면 분기"가 아니라 서버에서 최종 강제한다.
- 결제 금액(amount) 위변조 방지: 서버 저장 값과 리다이렉트/승인 값이 일치해야 한다.
- 민감정보(시크릿키/토큰)는 코드에 하드코딩 금지(.env 또는 application-*.yml).
- 모든 엔드포인트는 표준 에러 포맷으로 응답한다.

---

## 6. 개발/테스트 원칙 (MVP 최소 기준)
- 티켓 1개 단위로 작업하고, 티켓 범위 밖 변경은 금지(필요 시 제안만).
- 서버:
  - 최소 통합테스트(e2e/MockMvc) 몇 개라도 포함
  - `./gradlew test`가 통과해야 완료
- 모바일:
  - 최소한의 로딩/에러 처리
  - 역할별 화면 분기 동작 확인

---

## 7. MVP 범위에서 제외(후순위)
- 자동 배차 알고리즘
- 실시간 위치 추적/지도 최적화
- 채팅/콜
- 정산/세금계산서/고급 환불 정책
- 대규모 모니터링/분산 트레이싱
