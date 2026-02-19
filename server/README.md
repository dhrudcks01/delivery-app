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

If these values are not provided, Spring uses local defaults above.

## Run & verify

1. Install Java 17 and Gradle, or ensure a local `gradle` binary is available.
2. Run:
   - `./gradlew test`  (health endpoint + context test)
   - `./gradlew bootRun`
3. Validate:
   - `GET /health` returns `200` and `{"status":"ok"}`.
