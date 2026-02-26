# 운영 런북 (T-0605)

이 문서는 MVP 운영/개발 환경에서 자주 필요한 절차를 정리한 런북입니다.

범위:
- 원격/로컬 DB 연결
- 업로드 파일 운영
- 결제 실패 대응

전제:
- 로컬 개발에 Docker는 필수가 아닙니다.
- 서버는 `server/` 기준으로 실행합니다.

---

## 1) 원격/로컬 DB 운영

상세 설치/연결 절차는 아래 문서를 기준으로 합니다.
- `docs/dev/mysql-local.md`

### 1.1 필수 환경변수

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

예시 (macOS/Linux):

```bash
export DB_URL="jdbc:mysql://localhost:3306/delivery_dev?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul"
export DB_USERNAME="delivery"
export DB_PASSWORD="delivery1234!"
```

예시 (Windows PowerShell):

```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/delivery_dev?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul"
$env:DB_USERNAME="delivery"
$env:DB_PASSWORD="delivery1234!"
```

### 1.2 서버 실행 및 기본 검증

```bash
cd server
./gradlew bootRun
```

검증:
- `GET /health` -> `200`
- Flyway 마이그레이션 실패 로그가 없는지 확인

### 1.3 운영 점검 SQL

```sql
-- 최근 생성된 요청 확인
SELECT id, user_id, status, created_at
FROM waste_requests
ORDER BY id DESC
LIMIT 20;

-- 최근 결제 상태 확인
SELECT id, waste_request_id, status, amount, failure_code, updated_at
FROM payments
ORDER BY id DESC
LIMIT 20;
```

### 1.4 주문번호(orderNo) 규칙

- 용어 통일: `주문번호 = orderNo`
- 생성 규칙:
  - 기본: `WR-{id 6자리 0패딩}` (예: `WR-000123`)
  - id가 6자리를 초과하면: `WR-{id}` (예: `WR-1000001`)
- 저장 위치: `waste_requests.order_no` (UNIQUE)

### 1.5 수거 신청 데이터 확장(disposalItems, bagCount)

- 저장 필드:
  - `waste_requests.disposal_items` (JSON 문자열 배열)
  - `waste_requests.bag_count` (0 이상 정수)
- API 요청:
  - `POST /waste-requests`에 `disposalItems[]`, `bagCount`를 전달할 수 있습니다.
  - `bagCount`는 0 이상만 허용합니다.
  - `disposalItems`는 최소 1개 이상 입력을 권장합니다.
- 호환성 정책:
  - 기존 클라이언트 호환을 위해 두 필드는 옵셔널입니다.
  - 미전송 시 서버 기본값은 `disposalItems=[]`, `bagCount=0`입니다.

---

## 2) 업로드 파일 운영

업로드 API는 개발용 로컬 저장 방식입니다.

### 2.1 관련 설정

`server/src/main/resources/application.yml`

- `app.upload.local-dir` (기본: `./uploads`)
- `app.upload.max-size-bytes` (기본: `5242880`, 5MB)

환경변수 오버라이드:
- `APP_UPLOAD_LOCAL_DIR`
- `APP_UPLOAD_MAX_SIZE_BYTES`

### 2.2 엔드포인트

- `POST /uploads` (multipart `file`) -> 업로드 URL 반환
- `GET /uploads/files/{filename}` -> 파일 다운로드

### 2.3 파일 정책

- 허용 확장자: `jpg`, `jpeg`, `png`, `webp`
- 크기 제한 초과/형식 오류 시 `400 INVALID_UPLOAD_FILE`

### 2.4 운영 점검 체크리스트

1. 업로드 경로 디렉터리 존재 여부 확인
2. 서버 프로세스가 해당 디렉터리에 쓰기 권한이 있는지 확인
3. 오류 발생 시 응답 코드/에러코드 확인
   - `INVALID_UPLOAD_FILE`

예시 응답 확인:

```bash
curl -i -X POST http://localhost:8080/uploads \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@sample.jpg"
```

### 2.5 사진 URL 노출 정책 (T-0312)

- 개발/MVP 단계:
  - 상세 조회 응답의 `photos[].url`은 로컬 업로드 URL(`/uploads/files/{filename}`)을 그대로 노출합니다.
- 운영 고도화(후순위):
  - 공개 URL을 직접 노출하지 않고, 만료시간이 있는 signed URL 발급 방식으로 전환합니다.
  - 전환 전까지는 업로드 파일 접근 권한 정책(인증/인가)을 서버에서 점검합니다.

---

## 3) 결제 실패 대응

### 3.1 관련 상태

- 요청 상태: `PAYMENT_FAILED`
- 결제 상태: `FAILED`

### 3.2 사용자(USER) 측 확인

- `GET /user/payment-methods`
  - 결제수단 활성 여부/재등록 가능 여부 확인

카드 재등록 흐름:
1. `POST /user/payment-methods/registration/start`
2. 결제사 등록 완료 후 `GET /user/payment-methods/registration/success`
3. 실패 시 `GET /user/payment-methods/registration/fail`

### 3.3 운영자(OPS_ADMIN) 대응

1. 실패 목록 조회
   - `GET /ops-admin/payments/failed`
2. 결제 재시도
   - `POST /ops-admin/payments/waste-requests/{wasteRequestId}/retry`

재시도 결과:
- 성공 시 요청 상태: `COMPLETED`
- 실패 시 요청 상태: `PAYMENT_FAILED` 유지

### 3.4 에러 코드 기준

- `PAYMENT_RETRY_CONFLICT` (409)
  - 현재 상태에서 재시도 불가
- `PAYMENT_NOT_FOUND` (404)
  - 결제 이력 없음
- `INVALID_PAYMENT_METHOD_REGISTRATION` (400)
  - 결제수단 등록 파라미터/소유자 검증 실패

### 3.5 운영 점검 SQL

```sql
-- 결제 실패 건 조회
SELECT p.id, p.waste_request_id, p.status, p.failure_code, p.failure_message, p.updated_at
FROM payments p
WHERE p.status = 'FAILED'
ORDER BY p.updated_at DESC
LIMIT 50;

-- 요청 상태와 결제 상태 매칭 확인
SELECT wr.id AS request_id, wr.status AS request_status,
       p.id AS payment_id, p.status AS payment_status, p.failure_code
FROM waste_requests wr
LEFT JOIN payments p ON p.waste_request_id = wr.id
ORDER BY wr.id DESC
LIMIT 50;
```

---

## 4) 공통 트러블슈팅

### 4.1 DB 연결 실패

- `Access denied`: 계정/권한/host 조건 확인
- `Communications link failure`: 호스트/포트/방화벽/allowlist 확인

### 4.2 업로드 실패

- 확장자/용량 정책 위반 여부 확인
- 업로드 경로 권한/디스크 용량 확인

### 4.3 결제 재시도 실패

- 요청 상태가 `PAYMENT_FAILED`인지 확인
- 결제 레코드 상태가 `FAILED`인지 확인
- 사용자 활성 결제수단(`ACTIVE`) 존재 여부 확인

---

## 5) 보안 주의사항

- 시크릿/토큰/비밀번호를 코드/문서에 실제값으로 기록하지 않습니다.
- `authKey`, 결제 토큰 등 민감 정보는 로그에 출력하지 않습니다.
- 운영 DB 접속 정보와 개발 DB 접속 정보를 분리합니다.

---

## 6) 예외 로깅/요청 추적 운영 가이드 (T-0116)

### 6.1 500 예외 추적 규칙

- 전역 예외 처리(`GlobalExceptionHandler`)는 500 발생 시 아래 값을 `ERROR` 레벨로 기록합니다.
  - `requestId`
  - `uri`
  - `exceptionType`
  - `message`
  - stack trace
- API 공통 요청 로그(`ApiRequestLoggingFilter`)와 동일한 `requestId`를 사용하므로, 요청-예외 로그를 한 번에 연계할 수 있습니다.
- 500 응답 본문에도 `requestId`가 포함되어 CS/운영 이슈 접수 시 추적 키로 사용할 수 있습니다.

### 6.2 민감정보 로그 비노출/마스킹 정책

- 절대 로그 금지
  - 비밀번호 원문
  - JWT Access/Refresh 토큰 원문
  - 결제수단 식별값(`authKey`, billing key/token 등) 원문
- 요청/응답 공통 로그에는 메서드/URI/상태/처리시간/클라이언트IP/사용자 식별자만 남깁니다.
- 디버깅 시에도 민감정보 포함 가능성이 있는 객체 전체(`request body`, `headers`)를 그대로 로깅하지 않습니다.

### 6.3 로컬 SQL/파라미터 로그 가이드

- `server/src/main/resources/application-local.yml`에서 로컬 기본값은 `INFO`로 유지합니다.
  - `logging.level.org.hibernate.SQL=INFO`
  - `logging.level.org.hibernate.orm.jdbc.bind=INFO`
- 상세 추적이 필요할 때만 임시로 다음 레벨로 상향합니다.
  - `org.hibernate.SQL=DEBUG`
  - `org.hibernate.orm.jdbc.bind=TRACE`

### 6.4 재현 가능한 500 로그 확인 절차 (테스트 시나리오)

1. 서버 디렉터리에서 에러 응답 통합 테스트를 실행합니다.
   - `cd server`
   - `./gradlew test --tests com.delivery.ErrorResponseIntegrationTest`
2. `internalServerErrorReturnsStandardErrorResponseWithRequestIdAndErrorLog` 테스트가 `GET /test/errors/runtime`로 강제 500을 재현합니다.
3. 로그에서 아래 키워드를 확인합니다.
   - `Unhandled exception requestId=...`
   - `uri=/test/errors/runtime`
   - `exceptionType=java.lang.IllegalStateException`
4. 응답 JSON의 `requestId`와 로그의 `requestId`가 동일한지 확인합니다.
