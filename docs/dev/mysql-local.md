# 로컬/외부 MySQL 개발 가이드 (Docker 없이)

이 문서는 Windows/macOS 환경에서 Docker 없이 MySQL을 사용해 개발하는 방법을 안내합니다.
개발 환경에서는 다음 두 가지 방식 중 하나를 선택할 수 있습니다.

- 방식 A: 내 PC에 MySQL을 설치해서 로컬 DB 사용
- 방식 B: 외부(원격) 개발 DB에 접속해서 사용

핵심 원칙: 로컬 개발에 Docker는 필수가 아닙니다.

## 1. 공통 사전 조건

- MySQL 8.x 호환 DB
- 터미널(Windows: PowerShell, macOS: Terminal)
- 프로젝트 루트: `server/` (Spring Boot 3 + Flyway)

## 2. 방식 A - 로컬 MySQL 설치

### 2.1 Windows

1. MySQL Installer로 `MySQL Server 8.x` 설치
2. 설치 중 root 비밀번호 설정
3. 기본 포트 `3306` 확인
4. 서비스 실행 확인

```powershell
Get-Service -Name *mysql*
```

### 2.2 macOS (Homebrew)

```bash
brew update
brew install mysql
brew services start mysql
brew services list | grep mysql
```

### 2.3 로컬 DB/계정 생성 예시

```bash
mysql -u root -p
```

```sql
CREATE DATABASE delivery_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'delivery'@'localhost' IDENTIFIED BY 'delivery1234!';
GRANT ALL PRIVILEGES ON delivery_dev.* TO 'delivery'@'localhost';
FLUSH PRIVILEGES;
```

접속 검증:

```bash
mysql -u delivery -p -D delivery_dev -e "SELECT 1;"
```

## 3. 방식 B - 외부(원격) 개발 DB 사용

팀에서 공용 개발 DB를 사용한다면 아래 정보로 접속합니다.

- 호스트: 예) `dev-db.example.com`
- 포트: 예) `3306`
- DB명: 예) `delivery_dev`
- 계정/비밀번호: 팀에서 발급
- 네트워크 접근 제어: IP 허용 목록(allowlist) 필요 여부 확인

직접 접속 검증:

```bash
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USERNAME> -p -D <DB_NAME> -e "SELECT 1;"
```

주의:

- 운영 DB 접속 정보와 개발 DB 접속 정보를 분리합니다.
- 개발에서는 운영 DB를 직접 사용하지 않습니다.
- 원격 DB 사용 시 TLS/보안 옵션은 인프라 정책을 따릅니다.

## 4. Spring Boot 설정 예시

`server/src/main/resources/application-local.yml`에는 값을 하드코딩하지 않고 환경변수를 우선 사용합니다.

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/delivery_dev?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul}
    username: ${DB_USERNAME:delivery}
    password: ${DB_PASSWORD:delivery1234!}
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
```

외부 DB를 사용할 때는 실행 전에 환경변수를 설정합니다.

Windows PowerShell:

```powershell
$env:DB_URL="jdbc:mysql://dev-db.example.com:3306/delivery_dev?useSSL=true&serverTimezone=Asia/Seoul"
$env:DB_USERNAME="delivery_dev_user"
$env:DB_PASSWORD="(발급받은 비밀번호)"
```

macOS/Linux:

```bash
export DB_URL="jdbc:mysql://dev-db.example.com:3306/delivery_dev?useSSL=true&serverTimezone=Asia/Seoul"
export DB_USERNAME="delivery_dev_user"
export DB_PASSWORD="(발급받은 비밀번호)"
```

## 5. 실행 및 검증

```bash
cd server
./gradlew bootRun
./gradlew test
```

## 6. 보안 체크리스트 (공개 레포지토리)

- DB 비밀번호, API 키, 토큰은 코드/문서에 실제값으로 커밋하지 않습니다.
- `.env`, `application-*.local.yml`, 키 파일(`*.pem`, `*.key`, `*.p12`)은 Git 제외 대상이어야 합니다.
- 민감정보는 로컬 환경변수 또는 별도 비공개 시크릿 저장소로 관리합니다.

## 7. 트러블슈팅

- `Access denied for user`
  - 계정/비밀번호 확인
  - 권한(`GRANT`)과 접속 host 조건 확인
- `Communications link failure`
  - DB 서버 실행 여부 확인
  - 호스트/포트/IP 허용 목록 확인
- Flyway 마이그레이션 실패
  - DB 권한과 `spring.datasource.*` 설정 확인
  - 기존 스키마와 충돌 여부 확인
