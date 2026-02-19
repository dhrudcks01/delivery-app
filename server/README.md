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

If these values are not provided, Spring uses local defaults above.

### SYS_ADMIN bootstrap (T-0102)

When both `APP_BOOTSTRAP_SYS_ADMIN_EMAIL` and `APP_BOOTSTRAP_SYS_ADMIN_PASSWORD` are set,
the server creates an initial `SYS_ADMIN` account at startup (idempotent).

1. Set environment variables.
2. Start the server.
3. Login with `POST /auth/login` using bootstrap email/password.
4. Verify role with `GET /me` and confirm `roles` includes `SYS_ADMIN`.

The bootstrap password is never hardcoded in source code. Manage it only via environment variables.

## Run & verify

1. Install Java 17 and Gradle, or ensure a local `gradle` binary is available.
2. Run:
   - `./gradlew test`  (health endpoint + context test)
   - `./gradlew bootRun`
3. Validate:
   - `GET /health` returns `200` and `{"status":"ok"}`.
