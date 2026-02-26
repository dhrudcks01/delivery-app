# PortOne(다날) 휴대폰 본인인증 서버 연동 가이드 (T-0118)

## 1) 환경변수
- `APP_PHONE_VERIFICATION_PROVIDER` (기본값: `PORTONE_DANAL`)
- `APP_PHONE_VERIFICATION_BASE_URL` (기본값: `https://api.portone.io`)
- `APP_PHONE_VERIFICATION_STORE_ID`
- `APP_PHONE_VERIFICATION_CHANNEL_KEY`
- `APP_PHONE_VERIFICATION_API_SECRET`
- `APP_PHONE_VERIFICATION_CONNECT_TIMEOUT_MILLIS` (기본값: `2000`)
- `APP_PHONE_VERIFICATION_READ_TIMEOUT_MILLIS` (기본값: `3000`)

`storeId`, `channelKey`, `apiSecret`은 코드에 하드코딩하지 않고 환경변수로만 주입한다.

## 2) API
- 시작: `POST /user/phone-verifications/start`
  - 응답: `provider`, `storeId`, `channelKey`, `identityVerificationId`
- 완료: `POST /user/phone-verifications/complete`
  - 요청: `{ "identityVerificationId": "..." }`
  - 서버가 PortOne `GET /identity-verifications/{identityVerificationId}`를 조회해 `VERIFIED` 여부를 검증

## 3) 상태/에러 정책
- `VERIFIED`: 사용자 휴대폰/인증시각/CI/DI 저장
- `READY`: `PHONE_VERIFICATION_NOT_COMPLETED` (409)
- `FAILED` + 취소 사유: `PHONE_VERIFICATION_CANCELED` (409)
- `FAILED` + 일반 실패: `PHONE_VERIFICATION_FAILED` (409)
- 외부 타임아웃: `PHONE_VERIFICATION_TIMEOUT` (504)
- 외부 연동 장애: `PHONE_VERIFICATION_UNAVAILABLE` (502)

동일 `identityVerificationId`에 대해 이미 `VERIFIED` 상태면 재호출 시 멱등 응답(`idempotent=true`)을 반환한다.

## 4) 로그 보안
- `apiSecret`, `ci`, `di`, 휴대폰 원문 값을 로그에 출력하지 않는다.
- 예외 메시지는 추적 가능한 수준으로 유지하되 민감값은 포함하지 않는다.
