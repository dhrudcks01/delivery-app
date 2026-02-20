# 결제수단 등록(customer_key) 규칙

T-0403 카드 등록 콜백 처리에서 사용하는 `customer_key` 규칙은 아래와 같다.

- 형식: `delivery_user_{userId}_{random32hex}`
- 예시: `delivery_user_15_f0a1b2c3d4e5f67890123456789abcde`
- `userId`: 로그인한 사용자 ID
- `random32hex`: UUID에서 `-`를 제거한 32자리 소문자 16진수

검증 규칙:

- success 콜백에서 `customer_key`가 위 형식과 일치해야 한다.
- `customer_key`에 포함된 `userId`와 현재 인증 사용자 ID가 일치해야 한다.
- 일치하지 않으면 서버는 400(`INVALID_PAYMENT_METHOD_REGISTRATION`)을 반환한다.

보안 주의사항:

- `authKey`(billing key/token)는 로그에 남기지 않는다.
- 민감 파라미터는 응답 본문에 그대로 재노출하지 않는다.
