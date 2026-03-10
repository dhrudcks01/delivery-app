# mobile

Delivery MVP 모바일 앱(Expo + TypeScript) 프로젝트입니다.

## T-0501 ~ T-0504, T-0507 ~ T-0508, T-0513, T-0516 ~ T-0520 구현 범위

- Expo TypeScript 앱 기본 스캐폴딩
- React Navigation 기반 네비게이션
- API 클라이언트/Axios 설정
- 토큰 저장소(AsyncStorage)
- 401 응답 시 `/auth/refresh` 자동 재발급 인터셉터
- 이메일 로그인 UI
- 문자열 식별자 회원가입 UI/가입 후 자동 로그인 진입
- `/me` 기반 역할 분기
  - 단일 권한 계정: 해당 홈 화면으로 즉시 진입 (하단 탭 미노출)
  - 멀티 권한 계정: 역할 선택 허브에서 화면 전환
  - DRIVER 권한 포함 계정: DRIVER 배정 화면 진입 동선 제공
- USER 수거 신청 기능
  - 생성
  - 목록 조회
  - 상세 조회
  - 취소(REQUESTED 상태)
  - 도로명 주소 검색 연동(`/addresses/road-search`) 및 상세주소 분리 입력
- DRIVER 배정 요청 기능
  - 목록 조회
  - 상세 조회
- DRIVER 측정 완료 기능
  - 무게 입력
  - 사진 선택/업로드(`/uploads`)
  - 측정 완료 처리(`/driver/waste-requests/{id}/measure`)
- DRIVER 전용 배정건 화면 강화
  - 목록/상세/측정 완료 액션 흐름 정리
  - 상태 필터(처리 필요/처리 완료/전체) 제공
  - ASSIGNED 건 우선 처리 배지 표시
- OPS_ADMIN/SYS_ADMIN 기사신청 승인 화면 개선
  - PENDING 기사신청 목록 조회/선택
  - 선택 신청 상세 확인 후 승인/반려 처리
  - 처리 완료 시 대기 목록 즉시 갱신
- 권한 신청/승인 화면
  - USER/DRIVER: OPS_ADMIN 권한 신청
  - OPS_ADMIN: SYS_ADMIN 권한 신청
  - SYS_ADMIN: OPS_ADMIN/SYS_ADMIN 신청 목록, 승인/반려, 처리 이력 표시
  - SYS_ADMIN: DRIVER 계정 검색 기반 OPS_ADMIN 권한 부여 동선 제공
  - SYS_ADMIN: 비 SYS_ADMIN 계정 검색 기반 SYS_ADMIN 권한 부여 동선 제공

## 환경 변수

- `EXPO_PUBLIC_API_BASE_URL`
  - 예: `http://localhost:8080`
  - 미설정 시 기본값 `http://localhost:8080`

## 로컬 실행

```bash
cd mobile
npm install
npm run start
```

플랫폼 실행 예시:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
```

## 참고

- Docker 없이 로컬 개발 가능
- 실제 OPS_ADMIN/SYS_ADMIN 업무 기능은 후속 티켓에서 구현

## Android APK 빌드 (실기기 설치용)

알림(Push) 실기기 테스트는 Expo Go 대신 APK 설치본으로 진행하는 것을 권장합니다.

### 1) 사전 준비

1. Expo 계정 로그인
```bash
cd mobile
npx eas-cli login
```

2. EAS 프로젝트 연결(최초 1회)
```bash
npx eas-cli init
```

3. 필요 시 EAS Build 설정 동기화
```bash
npx eas-cli build:configure --platform android
```

### 2) APK 빌드

```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

- `preview` 프로필은 `mobile/eas.json`에서 APK(`buildType: apk`)로 설정되어 있습니다.
- 빌드 완료 후 EAS가 제공한 설치 URL/QR로 안드로이드 기기에 APK를 설치합니다.

### 3) 서버/앱 연결 확인

1. 서버를 IntelliJ에서 실행
2. `EXPO_PUBLIC_API_BASE_URL`이 안드로이드 기기에서 접근 가능한 서버 주소인지 확인
   - 예: `http://192.168.x.x:8080`
3. 앱 로그인 후 알림 권한 허용
4. `user_push_tokens` 테이블에 토큰이 등록되고 `is_active=true`인지 확인

## 알림 기능 실기기 테스트 절차

### 권장 시나리오 A (일반 사용자 플로우)

1. USER 계정으로 로그인
2. 수거 신청 생성
3. 서버에서 `WASTE_REQUEST_CREATED` 알림 발송 로그 확인
4. 안드로이드 기기에서 푸시 수신 확인
5. 알림 탭 시 앱 내 라우팅(상세 또는 알림함) 확인

### 권장 시나리오 B (운영자 브로드캐스트)

OPS_ADMIN 토큰으로 아래 API 호출:

```bash
curl -X POST "http://<SERVER_HOST>:8080/ops-admin/notifications/broadcast" \
  -H "Authorization: Bearer <OPS_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"알림 테스트\",
    \"message\": \"안드로이드 실기기 알림 테스트입니다.\",
    \"targetType\": \"ALL_USERS\",
    \"targetUserIds\": [],
    \"scheduledAt\": null,
    \"category\": \"NOTICE\"
  }"
```

## Expo Push 연동 체크포인트

1. 서버 설정(`application.yml`)
   - `app.notification.expo.*` 항목 확인
   - 필요 시 `APP_NOTIFICATION_EXPO_ACCESS_TOKEN` 환경변수 설정
2. Expo/EAS 프로젝트에서 Android Push 자격증명(FCM) 설정
3. 앱 패키지명(`mobile/app.json`의 `android.package`)과 EAS 프로젝트 설정 일치 확인

## 트러블슈팅

- 토큰 발급 실패:
  - 실기기인지 확인(에뮬레이터/Expo Go 제한 가능)
  - 알림 권한 허용 여부 확인
- 푸시 미수신:
  - 서버에서 Expo 발송 성공 로그(`result=SUCCESS`) 확인
  - `user_push_tokens.is_active` 값 확인
  - 앱이 배터리 최적화/알림 차단 상태인지 확인
- 라우팅 미동작:
  - 알림 payload에 `type`, `wasteRequestId` 포함 여부 확인
