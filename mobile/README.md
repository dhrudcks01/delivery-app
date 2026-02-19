# mobile

Delivery MVP 모바일 앱(Expo + TypeScript) 프로젝트입니다.

## T-0501/T-0502 구현 범위

- Expo TypeScript 앱 기본 스캐폴딩
- React Navigation 기반 네비게이션
  - Root Stack: `Login` -> `MainTabs`
  - Bottom Tabs: `USER`, `DRIVER`, `OPS_ADMIN`, `SYS_ADMIN`
- API 클라이언트/Axios 설정
- 토큰 저장소(AsyncStorage)
- 401 응답 시 `/auth/refresh` 자동 재발급 인터셉터

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
- 실제 이메일 로그인 UI/역할 분기는 후속 티켓(T-0503)에서 구현
