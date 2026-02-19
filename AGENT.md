# AGENTS (Project Instructions for Codex)

You must follow these rules for every task:

1) Always read:
- docs/CONSTRAINTS.md
- docs/MVP_TICKETS.md

2) Implement exactly ONE ticket per run.
- Ask for the ticket ID only if it is missing.
- Do NOT implement other tickets, refactors, or “nice-to-haves”.

3) Definition of Done (DoD)
- Provide a short summary of changes
- List changed files
- Provide local verification commands
- Run relevant tests (server: ./gradlew test) when applicable
- Ensure no Docker is required for local development

4) Tech constraints
- Backend: Spring Boot 3 / Java 17 / Gradle / MySQL / Flyway
- Mobile: Expo (React Native) / TypeScript
- Payment: Toss Payments (server-side confirm; webhook idempotency)
- Roles: USER/DRIVER/OPS_ADMIN/SYS_ADMIN (multi-role)

5) Keep solutions cross-platform (Windows + macOS).

6) Output language
- All summaries, explanations, and result reports MUST be written in Korean.
- Code comments may remain in English if necessary, but user-facing output must be Korean.