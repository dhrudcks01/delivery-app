# T-0123 권한 부여/검색 API 식별자 노출 정책

## 목적
- OPS_ADMIN/SYS_ADMIN 권한 부여 화면에서 대상 사용자를 `아이디(loginId)` + `이름(name)` 기준으로 식별한다.

## API 응답 계약
- `GET /sys-admin/users/ops-admin-grant-candidates`
- `GET /sys-admin/users/sys-admin-grant-candidates`

응답 `content[]` 필드:
- `userId`: 내부 PK
- `loginId`: 로그인 아이디(표시용 식별자)
- `name`: 사용자 이름

## 검색 정책
- 검색어는 `users.login_id`, `users.display_name` 기준으로 조회한다.
- 기존 역할 필터 정책은 유지한다.
  - OPS_ADMIN 부여 대상: DRIVER 보유 + OPS_ADMIN 미보유
  - SYS_ADMIN 부여 대상: SYS_ADMIN 미보유

## 감사 추적 정책
- 권한 변경 감사로그 DB(`role_change_audit_logs`)는 기존처럼 내부 PK(`actor_user_id`, `target_user_id`)를 저장한다.
- 운영 추적 가독성을 위해 서버 로그에 `actorLoginId`, `targetLoginId`를 함께 기록한다.
