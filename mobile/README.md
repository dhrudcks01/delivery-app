# mobile

Delivery MVP 모바일 앱(Expo + TypeScript) 프로젝트입니다.

## T-0501 구현 범위

- Expo TypeScript 앱 기본 스캐폴딩 생성
- React Navigation 기반 네비게이션 구성
  - Root Stack: `Login` -> `MainTabs`
  - Bottom Tabs: `USER`, `DRIVER`, `OPS_ADMIN`, `SYS_ADMIN`
- 역할별 홈 화면 placeholder 추가

## 로컬 실행

1. `mobile` 디렉터리로 이동
2. 의존성 설치
3. Expo 개발 서버 실행

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
```

## 참고

- Docker 없이 로컬 개발 가능
- 실제 인증/토큰/API 연동은 후속 티켓(T-0502, T-0503)에서 구현
