# server

Spring Boot backend skeleton for the Delivery MVP.

## Tech stack

- Spring Boot 3
- Java 17
- Gradle
- MySQL (no Docker required for local development)
- JPA + Flyway
- Security, OAuth2 Client
- Validation
- OpenAPI (springdoc)
- Lombok

## Environment

- `DB_URL` (example: `jdbc:mysql://localhost:3306/delivery`)
- `DB_USERNAME` (example: `delivery`)
- `DB_PASSWORD` (example: `delivery`)
- `JWT_SECRET` (example: `replace-with-long-random-secret`)
- `APP_BOOTSTRAP_SYS_ADMIN_EMAIL` (example: `admin@example.com`)
- `APP_BOOTSTRAP_SYS_ADMIN_PASSWORD` (example: `change-me-now`)
- `APP_BOOTSTRAP_SYS_ADMIN_DISPLAY_NAME` (optional, default: `시스템 관리자`)
- `APP_ADDRESS_SEARCH_BASE_URL` (도로명 주소 검색 외부 API URL)
- `APP_ADDRESS_SEARCH_API_KEY` (도로명 주소 검색 API 키)
- `APP_ADDRESS_SEARCH_CONNECT_TIMEOUT_MILLIS` (기본: `2000`)
- `APP_ADDRESS_SEARCH_READ_TIMEOUT_MILLIS` (기본: `3000`)
- `APP_ADDRESS_SEARCH_DEFAULT_LIMIT` (기본: `10`)
- `APP_ADDRESS_SEARCH_MAX_LIMIT` (기본: `30`)

If these values are not provided, Spring uses local defaults above.

### SYS_ADMIN bootstrap (T-0102)

When both `APP_BOOTSTRAP_SYS_ADMIN_EMAIL` and `APP_BOOTSTRAP_SYS_ADMIN_PASSWORD` are set,
the server creates an initial `SYS_ADMIN` account at startup (idempotent).

1. Set environment variables.
2. Start the server.
3. Login with `POST /auth/login` using bootstrap email/password.
4. Verify role with `GET /me` and confirm `roles` includes `SYS_ADMIN`.

The bootstrap password is never hardcoded in source code. Manage it only via environment variables.

### Address search API (T-0112)

- Endpoint: `GET /addresses/road-search?query={검색어}&limit={개수}`
- 인증: JWT 필요
- 응답: 검색어, 적용 limit, 주소 목록
- 외부 API 타임아웃/장애 시 표준 에러 응답
  - `ADDRESS_SEARCH_TIMEOUT` (504)
  - `ADDRESS_SEARCH_UNAVAILABLE` (502)

## Run & verify

1. Install Java 17 and Gradle, or ensure a local `gradle` binary is available.
2. Run:
   - `./gradlew test`  (health endpoint + context test)
   - `./gradlew bootRun`
3. Validate:
   - `GET /health` returns `200` and `{"status":"ok"}`.
