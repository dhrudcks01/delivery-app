# Mobile UI System

이 문서는 모바일 앱 UI 구현 시 반드시 따라야 하는 공통 디자인 시스템과 UI 규칙을 정의한다.

목표
- 실제 서비스 앱 수준의 일관된 UI 제공
- Codex/AI가 기능 티켓 구현 시 동일한 UI 규칙을 따르도록 강제
- USER / DRIVER / OPS_ADMIN / SYS_ADMIN 화면의 UI 일관성 유지

기술 스택
- Expo (React Native)
- TypeScript
- React Navigation

---

# 1. Design Principles

1. 단순성
   - 화면당 주요 액션은 1~2개만 강조한다.

2. 일관성
   - 동일 기능은 동일 UI 패턴을 사용한다.

3. 모바일 중심 UX
   - 터치 영역 최소 44px
   - 스크롤 기반 화면 구조

4. 카드 기반 레이아웃
   - 모든 리스트는 카드(Card) 형태로 표시

---

# 2. Layout Rules

모든 화면은 다음 기본 구조를 따른다.

SafeArea  
ScreenContainer  
Header  
Content  
Footer(optional)

Screen padding: 16px  
Section spacing: 24px  
Card spacing: 12px  

---

# 3. Spacing System

모든 UI spacing은 8px 단위를 사용한다.

8px  
16px  
24px  
32px  
40px  

예시

Card padding: 16px  
Section spacing: 24px  
Button margin: 16px  

---

# 4. Color System

Primary Color  
#2563EB

Success  
#16A34A

Warning  
#F59E0B

Error  
#DC2626

Background  
#F9FAFB

Card Background  
#FFFFFF

Border  
#E5E7EB

---

# 5. Typography

Title  
fontSize: 20  
fontWeight: 700  

Section Title  
fontSize: 16  
fontWeight: 600  

Body  
fontSize: 14  

Caption  
fontSize: 12  

---

# 6. Core Components

모든 화면은 아래 공통 컴포넌트를 사용한다.

Card  
PrimaryButton  
SecondaryButton  
SectionHeader  
InputField  
EmptyState  
LoadingSkeleton  
StatusBadge  

---

# 7. Card Component

borderRadius: 12  
padding: 16  
backgroundColor: white  
borderColor: #E5E7EB  

Card 구조

Title  
Description  
MetaInfo  
ActionButton  

---

# 8. Button Rules

PrimaryButton

height: 48  
borderRadius: 12  
background: Primary Color  
textColor: white  

SecondaryButton

height: 48  
borderRadius: 12  
border: 1px solid #E5E7EB  
background: white  

---

# 9. List UI Pattern

모든 리스트 화면은 다음 구조를 사용한다.

Screen  
SectionHeader  
CardList  
Card  
Card  
Card  

---

# 10. Empty State

데이터가 없을 때 반드시 Empty State UI를 제공한다.

구성

Icon  
Title  
Description  
PrimaryButton(optional)  

예

아직 수거 요청이 없습니다  
수거 요청을 생성해보세요  

---

# 11. Loading State

데이터 로딩 시 Skeleton UI를 사용한다.

Card Skeleton  
Card Skeleton  
Card Skeleton  

---

# 12. Status UI

상태 표시에는 Badge UI를 사용한다.

REQUESTED → 신청 완료  
ASSIGNED → 기사 배정  
MEASURED → 수거 완료  
COMPLETED → 처리 완료  
PAYMENT_FAILED → 결제 실패  

Badge 스타일

padding: 4px 8px  
borderRadius: 8px  
fontSize: 12  

---

# 13. Image UI

사진 표시 규칙

thumbnail grid  
2~3 column  
borderRadius: 8  

클릭 시 Full screen viewer

---

# 14. Navigation Rules

모든 화면은 다음 Navigation 패턴을 따른다.

Home  
신청  
이용내역  
내정보  

상세 화면은 push navigation 사용

---

# 15. Form UX Rules

모든 입력 폼은 다음 UX 규칙을 따른다.

Input label  
Input field  
Validation message  

Keyboard 대응

KeyboardAvoidingView  
ScrollView  

---

# 16. AI Implementation Rules

Codex / Agent가 UI를 구현할 때 반드시 다음 규칙을 따른다.

1. 공통 UI 컴포넌트를 우선 사용한다  
2. 모든 리스트는 Card UI 사용  
3. Empty / Loading / Error 상태 구현 필수  
4. spacing은 8px grid 사용  

---

# 17. Reference UX

다음 앱 UX를 참고한다.

오늘수거 앱  
당근마켓  
토스 앱  

특징

카드 기반 UI  
큰 버튼  
간결한 화면  

---

# 18. Future Improvements

Dark Mode  
Animation  
Haptic feedback  
Design tokens