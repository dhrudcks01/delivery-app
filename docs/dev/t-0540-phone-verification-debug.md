# T-0540 본인인증 즉시 실패 디버깅 가이드

## 목적
- 로그인 직후 휴대폰 본인인증 시작 시 즉시 실패하는 케이스를 재현하고 원인을 로그로 추적한다.
- 사용자 화면에는 일반 메시지만 노출하고, 개발/운영 로그에서는 `requestId`로 원인을 찾는다.

## 재현 시나리오
1. 미인증 계정으로 로그인한다.
2. `휴대폰 인증 시작` 버튼을 누른다.
3. 즉시 실패 문구가 보이면, 모바일 로그와 서버 로그를 같은 시각 기준으로 확인한다.
4. `요청 ID: ...`가 표시되면 해당 ID로 서버 로그를 역추적한다.

## 모바일 로그 확인 포인트
- 태그: `[PhoneVerification]`
- 주요 단계:
  - `start-requested` / `start-success` / `start-failed`
  - `webview-message-raw` / `webview-message-parsed`
  - `webview-portone-error`
  - `webview-navigation`
  - `complete-requested` / `complete-success` / `complete-failed`
- 기대 확인값:
  - `storeId`, `channelKey`, `identityVerificationId`는 마스킹된 값으로 출력
  - `PORTONE_ERROR` 시 `reason`이 함께 출력
  - redirect URL 매칭 여부(`matched`) 출력

## 서버 로그 확인 포인트
- 요청 로그 필터에서 `X-Request-Id`가 자동 생성/전파된다.
- `PhoneVerificationService`:
  - `phoneVerification.start requested/created`
  - `phoneVerification.complete requested/providerResult/verified/failed/canceled`
- `PortOneIdentityVerificationClient`:
  - provider 호출 URI/응답 status/failureCode
  - timeout/http-error/rest-client-error
- `GlobalExceptionHandler`:
  - `Phone verification exception ... requestId=...`

## 빠른 원인 분류 체크리스트
- 설정 누락:
  - `PHONE_VERIFICATION_CONFIGURATION_ERROR`
  - `storeId`, `channelKey`, `apiSecret` 환경변수 누락 여부 확인
- 사용자 취소:
  - `PHONE_VERIFICATION_CANCELED`
  - `failureCode`에 `CANCEL` 계열 포함 여부 확인
- 인증 미완료:
  - `PHONE_VERIFICATION_NOT_COMPLETED`
  - WebView redirect 후 완료 API 호출 타이밍 확인
- 외부 장애/타임아웃:
  - `PHONE_VERIFICATION_TIMEOUT`, `PHONE_VERIFICATION_UNAVAILABLE`
  - provider HTTP status/body, timeout 로그 확인

## 검증 기준
- 정상 1건, 실패 1건에서 아래가 모두 가능해야 한다.
  - 모바일 로그만으로 실패 단계(start/webview/complete) 식별
  - `requestId`로 서버 로그 역추적
  - 최종 실패 원인(취소/미완료/타임아웃/설정오류/외부장애) 판별
