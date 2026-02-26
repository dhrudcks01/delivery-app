# T-0120 내정보 휴대폰 인증정보 조회/수정 정책

## 1) `/me` 응답 정책
- `/me` 응답에 아래 필드를 포함한다.
  - `phoneNumber`: 인증된 휴대폰 번호 마스킹 값
  - `phoneVerifiedAt`: 인증 완료 시각(UTC)
  - `phoneVerificationProvider`: 인증 제공자 코드
- 마스킹 규칙
  - 기본 형식: `010-****-1234`
  - E.164(`+82...`) 저장값을 로컬 표시 형식으로 변환 후 마스킹
  - 미인증 사용자는 `phoneNumber`, `phoneVerifiedAt`, `phoneVerificationProvider`가 `null`

## 2) 프로필 수정 정책
- 프로필 수정 API: `PATCH /user/profile`
- `displayName`은 수정 가능
- `phoneNumber`는 요청에 포함되면 즉시 거절
  - 에러 코드: `PHONE_NUMBER_UPDATE_NOT_ALLOWED`
  - 메시지: `휴대폰 번호는 본인인증으로만 변경할 수 있습니다.`

## 3) 권한 정책
- `/me`: 인증 사용자 접근 가능(본인 정보 조회)
- `/user/profile`: `USER/DRIVER/OPS_ADMIN/SYS_ADMIN` 권한 사용자 접근 가능(`SecurityConfig`의 `/user/**` 정책 적용)
- 휴대폰 번호 변경은 API 경로와 무관하게 허용하지 않으며, 본인인증 플로우(T-0118)로만 갱신한다.
