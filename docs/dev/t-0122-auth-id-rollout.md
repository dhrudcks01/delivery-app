# T-0122 로그인/회원가입 API 식별자 전환 가이드

## 변경 요약
- `/auth/register`, `/auth/login` 요청 식별자 필드를 `email`에서 `id`로 전환한다.
- 서버 내부 인증 기준은 `users.login_id`를 사용한다.
- 로그인 감사로그(`login_audit_logs.login_identifier`)는 `loginId` 값을 저장한다.

## API 계약
- 신규 권장 요청 필드
  - 회원가입: `{ "id": "...", "password": "...", "displayName": "..." }`
  - 로그인: `{ "id": "...", "password": "..." }`

## 호환 정책(단계적 전환)
- 하위 호환을 위해 서버는 일정 기간 `email` 필드도 허용한다.
  - `id`를 우선 사용
  - `id`가 없으면 `email` alias로 수용
- 모바일/외부 클라이언트는 즉시 `id` 필드로 전환하는 것을 권장한다.

## 배포 순서 권장
1. 서버 먼저 배포(`id` 표준 + `email` alias 허용)
2. 모바일/클라이언트 요청 페이로드를 `id`로 전환
3. 전환 완료 후 `email` alias 제거 여부를 후속 티켓(T-0123 이후)에서 결정
