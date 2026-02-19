# 로컬 MySQL 개발 가이드 (Docker 없이)

이 문서는 **Windows / macOS** 환경에서 Docker 없이 MySQL을 설치하고, 백엔드 로컬 개발에 필요한 기본 DB를 준비하는 절차를 안내합니다.

## 1. 사전 조건

- MySQL 8.x
- 터미널(Windows: PowerShell, macOS: Terminal)
- 프로젝트 루트: `server/` (Spring Boot 3 + Flyway)

## 2. 설치

## 2.1 Windows

1. MySQL Installer를 사용해 `MySQL Server 8.x`를 설치합니다.
2. 설치 중 root 비밀번호를 설정합니다.
3. 기본 포트는 `3306`을 사용합니다.
4. 설치 완료 후 서비스 실행 상태를 확인합니다.

PowerShell 확인:

```powershell
Get-Service -Name *mysql*
```

## 2.2 macOS

Homebrew 기준:

```bash
brew update
brew install mysql
brew services start mysql
```

동작 확인:

```bash
brew services list | grep mysql
```

## 3. DB/계정 생성

아래 예시는 로컬 개발용 계정을 분리해 사용하는 방법입니다.

MySQL 접속:

```bash
mysql -u root -p
```

SQL 실행:

```sql
CREATE DATABASE delivery_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'delivery'@'localhost' IDENTIFIED BY 'delivery1234!';
GRANT ALL PRIVILEGES ON delivery_dev.* TO 'delivery'@'localhost';
FLUSH PRIVILEGES;
```

주의:
- 운영 환경과 동일한 비밀번호를 로컬에서 재사용하지 않습니다.
- 비밀번호/시크릿은 코드에 하드코딩하지 않습니다.

## 4. 접속 검증

터미널에서 직접 검증:

```bash
mysql -u delivery -p -D delivery_dev -e "SELECT 1;"
```

정상이라면 `1` 값이 반환됩니다.

## 5. Spring Boot 연결 예시

`server/src/main/resources/application-local.yml` 예시:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/delivery_dev?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul
    username: delivery
    password: delivery1234!
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
```

환경변수 기반으로 분리하려면:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/delivery_dev?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul}
    username: ${DB_USERNAME:delivery}
    password: ${DB_PASSWORD:delivery1234!}
```

## 6. 로컬 실행 점검

`server/`에서 실행:

```bash
./gradlew bootRun
```

추가 검증:

```bash
./gradlew test
```

## 7. 트러블슈팅

- `Access denied for user`
  - 사용자/비밀번호 재확인
  - `GRANT` 대상 DB와 계정(host 포함) 확인
- `Communications link failure`
  - MySQL 서비스 실행 여부 확인
  - 포트 `3306` 충돌 여부 확인
- Flyway 마이그레이션 실패
  - DB 권한과 `spring.datasource.*` 설정 확인
  - 이미 생성된 스키마/테이블과 충돌 여부 확인

---

이 프로젝트의 로컬 개발은 **Docker가 필수가 아닙니다.**
