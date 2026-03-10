# COUPON_EXPIRING Payload 규격 (T-0811)

## 1) 이벤트 개요
- 이벤트 키: `COUPON_EXPIRING`
- 목적: 쿠폰 만료 전 사용자에게 사전 안내 알림 발송
- 기본 정책(초안)
  - 만료 3일 전 1회
  - 만료 1일 전 1회

## 2) 서버 스케줄러/배치 구조
- 스케줄러: `CouponExpiringNotificationScheduler`
- 서비스: `CouponExpiringNotificationService`
- 대상 조회 포트: `CouponExpiringNotificationTargetReader`
- 기본 구현: `NoOpCouponExpiringNotificationTargetReader` (현재는 쿠폰 도메인 미연동)
- feature flag: `app.notification.coupon-expiring.enabled` (기본값 `false`)

## 3) payload JSON 필드
```json
{
  "event": "COUPON_EXPIRING",
  "couponId": 301,
  "couponCode": "WELCOME10",
  "expiresOn": "2026-03-15",
  "daysBeforeExpiry": 3,
  "deepLink": "/coupons"
}
```

- `event`: 알림 이벤트 식별자 (`COUPON_EXPIRING`)
- `couponId`: 쿠폰 식별자 (연동 전에는 `null` 가능)
- `couponCode`: 사용자 노출용 쿠폰 코드/이름
- `expiresOn`: 만료일 (`yyyy-MM-dd`)
- `daysBeforeExpiry`: 만료까지 남은 일수 (`3` 또는 `1`)
- `deepLink`: 앱 내 이동 경로 (쿠폰함)

## 4) 중복 방지 기준
- `notifications` 저장 전 아래 조건으로 중복 확인:
  - `user`
  - `type = COUPON_EXPIRING`
  - `payload_json` 동일
- 동일 쿠폰/동일 만료일이라도 `daysBeforeExpiry`가 다르면 payload가 달라져 각각 1회 발송 가능

## 5) 쿠폰 도메인 연동 시 연결 지점
- `CouponExpiringNotificationTargetReader#readTargets(expiresOn, batchSize)` 구현을 쿠폰 도메인에서 제공
- 추천 조회 조건
  - `expires_on = (기준일 + daysBeforeExpiry)`
  - `status = ACTIVE`
  - 사용자별 발급 쿠폰 단위 조회
- 연동 완료 후 feature flag를 `true`로 전환해 즉시 발송 활성화
