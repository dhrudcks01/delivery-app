# T-0406 결제 대기풀/상태 노출 정책

## 1) MEASURED 이후 결제 실행 정책
- DRIVER가 `MEASURED` 처리하면 서버는 먼저 요청 상태를 `PAYMENT_PENDING`으로 전이한다.
- `payments` 레코드는 `PENDING`으로 생성된다.
- `ACTIVE + CARD` 결제수단이 있으면 자동결제를 즉시 시도하고, 성공 시:
  - 내부 상태: `PAYMENT_PENDING -> PAID -> COMPLETED`
  - 결제 상태: `PENDING -> SUCCEEDED`
- 활성 카드가 없으면 자동결제를 즉시 실패 처리하지 않고 `PAYMENT_PENDING`에 유지한다.
  - 이 건은 OPS 결제 대기풀에서 일괄 실행 대상이 된다.

## 2) OPS 결제 대기풀 API
- `GET /ops-admin/payments/pending`
  - `payments.status = PENDING` 목록 조회
- `POST /ops-admin/payments/pending/batch-execute`
  - 요청 본문: `{ "wasteRequestIds": [1,2,3] }`
  - `wasteRequestIds`가 비어 있으면 현재 `PENDING` 전체 실행
  - 결과 응답: `requestedCount/succeededCount/failedCount/skippedCount/results[]`

## 3) USER/OPS 상태 노출 분리
- 내부 상태(`PAYMENT_PENDING`, `PAID`)는 OPS/SYS API에서 그대로 유지한다.
- USER API(`/waste-requests`, `/waste-requests/{id}`)에서는 아래처럼 매핑해 노출한다.
  - `PAYMENT_PENDING -> MEASURED`
  - `PAID -> COMPLETED`
- USER 상세 타임라인에서도 동일 매핑을 적용하고, 동일 상태로 축약되는 구간은 제거한다.
  - 예: `MEASURED -> PAYMENT_PENDING` 내부 전이는 USER 타임라인에서 숨김.

## 4) 로컬 검증 포인트
- 자동결제 성공 케이스: USER에서 `MEASURED` 이후 최종 `COMPLETED` 노출
- 카드 미등록 케이스: 측정 직후 `PAYMENT_PENDING` 큐 적재 확인
- OPS 일괄 실행: 성공/실패/스킵 카운트 및 상태 전이 확인
