# T-0529 모바일 Safe Area 전면 적용 수동 검증

## 목적
- 노치/상태바 영역에서 상단 UI 잘림이 발생하지 않는지 확인한다.
- 헤더 표시/숨김 화면에서 safe area inset 정책이 충돌하지 않는지 확인한다.

## 적용 정책 요약
- 앱 루트에 `SafeAreaProvider` 적용
- 헤더 숨김 탭 화면(`HomeTab` 비USER, `RequestTab`, `HistoryTab`)에만 상단 inset(`top`) 적용
- 입력형 스크린 공통 래퍼(`KeyboardAwareScrollScreen`)에서 `includeTopInset` 옵션으로 화면별 edge 제어

## 기기/회전 검증 범위
- iOS 노치 기기 1종 (예: iPhone 15)
- iOS 비노치 기기 1종 (예: iPhone SE)
- Android 소형/대형 1종씩 (예: Galaxy S, Pixel XL)
- 세로/가로 회전 각각 확인

## 화면별 시나리오
1. 로그인/회원가입
- 상단 헤더와 입력 폼 첫 줄이 겹치지 않는지 확인
- 키보드 열림/닫힘 후 상단 여백이 비정상적으로 커지지 않는지 확인

2. USER 탭 (`신청`/`이용내역`)
- 헤더 숨김 상태에서 첫 카드/타이틀이 상태바에 가려지지 않는지 확인
- 상하 스크롤 중 상단 잘림/점프 현상 없는지 확인

3. 비USER `홈` 탭 (DRIVER/OPS_ADMIN/SYS_ADMIN)
- 헤더 숨김 상태에서 상단 타이틀/상태 카드가 노치와 겹치지 않는지 확인
- 목록/상세 진입 및 스크롤 시 상단 레이아웃 안정성 확인

4. 내정보 하위 화면 (주소관리/결제수단/설정)
- 스택 헤더 표시 화면에서 중복 top inset(불필요한 큰 상단 공백) 없는지 확인
- iOS/Android 모두에서 상단 잘림 없이 정상 표시되는지 확인

## 스크린샷 기록 템플릿
- iOS 노치(세로): PASS/FAIL, 스크린샷 경로
- iOS 노치(가로): PASS/FAIL, 스크린샷 경로
- Android 소형(세로): PASS/FAIL, 스크린샷 경로
- Android 대형(세로): PASS/FAIL, 스크린샷 경로

## 완료 기준
- 대상 화면에서 상단 잘림 0건
- 헤더 표시 화면에서 top inset 중복으로 인한 과도한 여백 0건
- 세로/가로 전환 시 레이아웃 깨짐 0건
