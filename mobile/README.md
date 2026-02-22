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
