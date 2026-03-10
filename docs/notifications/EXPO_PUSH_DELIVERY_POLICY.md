# Expo Push 발송/실패 처리 정책 (T-0812)

## 1) 발송 구조
- 발송 구현체: `ExpoPushNotificationSender`
- 전송 대상 API: `POST https://exp.host/--/api/v2/push/send`
- 공통 인터페이스: `PushNotificationSender`
- 설정 프로퍼티:
  - `app.notification.expo.base-url`
  - `app.notification.expo.send-path`
  - `app.notification.expo.access-token`
  - `app.notification.expo.connect-timeout-millis`
  - `app.notification.expo.read-timeout-millis`
  - `app.notification.expo.max-retry-attempts`

## 2) 발송 결과 기록 정책
- 성공:
  - `result=SUCCESS`
  - `provider`, `userId`, `tokenId`, `type`, `ticketId`, `attempt`
- 실패:
  - `result=FAILURE` 또는 `transport-error/http-error/client-error`
  - `statusCode`, `errorCode`, `ticketId`, `retryable`, `attempt`

주의:
- 민감정보(푸시 토큰 원문, Expo access token)는 로그에 남기지 않는다.

## 3) 무효/만료 토큰 처리 정책
- Expo 응답 `details.error == DeviceNotRegistered`이면
  - `user_push_tokens.is_active=false` 처리
  - `token-deactivated` 로그 기록

## 4) 일시 실패 재시도 정책
- 재시도 대상:
  - HTTP `429`
  - HTTP `5xx`
  - Expo 오류 코드 `MessageRateExceeded`
  - 네트워크 타임아웃(ResourceAccessException with SocketTimeoutException)
- 재시도 횟수:
  - `max-retry-attempts` 값만큼 추가 시도 (기본 1회)
  - 기본값 기준: 최대 2회 시도(초기 1회 + 재시도 1회)

## 5) 향후 확장 지점
- Expo 티켓/영수증(receipts) 조회 배치 추가 시, 추가 무효 토큰 정리 가능
- 현재 티켓은 "발송 시점 응답 기반" 실패 처리 정책까지 포함
