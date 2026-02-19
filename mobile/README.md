# mobile

Delivery MVP 모바일 앱(Expo + TypeScript) 프로젝트입니다.

## T-0501/T-0502/T-0503 구현 범위

- Expo TypeScript 앱 기본 스캐폴딩
- React Navigation 기반 네비게이션
- API 클라이언트/Axios 설정
- 토큰 저장소(AsyncStorage)
- 401 응답 시 `/auth/refresh` 자동 재발급 인터셉터
- 이메일 로그인 UI
- `/me` 기반 역할 분기 탭 노출(USER/DRIVER/OPS_ADMIN/SYS_ADMIN)

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
- 로그인 성공 후 `/me` 역할에 따라 접근 가능한 탭만 노출
- 실제 역할별 기능 화면은 후속 티켓(T-0504 이후)에서 구현
