# 트러블슈팅 및 문제 해결 기록 (Troubleshooting & Issue Logs)

### [2026-07-16] ignored 디렉토리 내 소스 코드 git add 오류 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 최상위 .gitignore의 /* 규칙으로 인해 web/ 폴더 하위 소스 코드 git add 시 ignore 에러 발생함
* **원인 (Cause)**: 프로젝트 루트의 전체 파일 예외 설정이 web/ 디렉토리 내의 변경 및 신규 파일 스테이징을 차단함
* **해결 (Solution)**: 변경 대상이 순수 소스 코드이므로 git add -f 옵션을 활용하여 강제 스테이징 및 커밋 처리함

### [2026-07-16] Next.js SSR Hydration Mismatch 오류 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 서버/클라이언트 간 `--sheet-min-height` 스타일 값(0px vs 211px) 불일치로 Hydration 에러 발생함
* **원인 (Cause)**: 서버 렌더링 시 window 객체 부재로 dvh 픽셀 계산 결과가 0px로 리턴되어 불일치가 발생함
* **해결 (Solution)**: Sidebar.tsx에 isMounted 플래그를 활용해 마운트 전 0px로 통일하고 마운트 후 픽셀값을 반영함

### [2026-07-16] 모바일 뷰 로그인 모달 터치 먹통 및 탭 가려짐 버그 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 모바일에서 로그인 모달의 터치/클릭이 불가능하고 탭 활성화 시 버튼이 하얗게 가려짐
* **원인 (Cause)**: 부모 aside의 pointer-events: none이 상속되고, 활성 탭 흰색 글씨와 호버 배경색(흰색)이 충돌함
* **해결 (Solution)**: 오버레이에 pointer-events: auto를 부여하고, 활성 탭 호버 시 파란색 배경을 유지하도록 important를 적용함

### [2026-07-21] 배포 시 서버 회원 데이터 초기화 문제 해결
* **분류**: 인프라
* **현상 (Problem)**: 신규 공고 DB 파일 배포 scp 실행 시 서버의 기존 회원 정보 및 찜/숨김 데이터가 덮어씌워져 삭제됨
* **원인 (Cause)**: 단일 SQLite DB(public_housing.db) 내에 공고 데이터와 실서버 동적 회원 데이터가 혼재되어 있었음
* **해결 (Solution)**: 회원 데이터를 user_data.db로 분리하여 웹 API 연동을 이관하고 1회성 마이그레이션 실행 가이드를 작성함

### [2026-07-21] 다크모드 전환 시 뱃지 및 필터 버튼 시인성 저하 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 다크모드 적용 시 기관 뱃지, D-Day/경고 뱃지, 주택형 필터 버튼 등이 밝은 라이트 파스텔 톤 배경으로 눈부심 발생함
* **원인 (Cause)**: 하드코딩된 라이트 파스텔 톤 배경 변수(--color-sh-bg 등) 및 --bg-light-gray가 body.dark에서 재정의되지 않음
* **해결 (Solution)**: body.dark 하위에 기관/D-Day/경고 뱃지용 반투명 다크 톤 변수를 재정의하고 필터 및 공고 버튼 다크 스타일을 추가함

### [2026-07-21] 구글 애드센스 가치가 별로 없는 콘텐츠 거절 이슈 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 구글 애드센스 심사 시 소유권 미인증 및 가치가 별로 없는 콘텐츠 사유로 승인 거절됨
* **원인 (Cause)**: layout.tsx 소유권 메타태그 누락 및 메인 페이지 CSR 구동으로 초기 HTML 텍스트가 부재함
* **해결 (Solution)**: layout.tsx에 adsense 메타태그를 추가하고 page.tsx를 SSR 서버 컴포넌트로 개편하여 정적 텍스트/링크를 프리렌더링함

### [2026-07-21] 메인 페이지 SSR 전환 후 지도 렌더링 미출력 오류 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 메인 페이지 SSR 개편 후 지도 화면이 출력되지 않고 0px로 가려짐
* **원인 (Cause)**: HomeClientLayout.tsx의 지도 컨테이너 클래스명이 page.module.css의 app-map-container와 불일치함
### [2026-07-21] Naver Maps API와 자바스크립트 전역 Map 식별자 충돌 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: Map.tsx 마커 재사용 최적화 중 new Map() 호출 시 TypeScript 타입 에러(TS7009, TS2558) 발생함
* **원인 (Cause)**: Naver Maps 네임스페이스 및 파라미터명과 ES6 전역 Map 클래스 식별자가 충돌함
* **해결 (Solution)**: 전역 내장 객체 명시를 위해 globalThis.Map 및 globalThis.Set으로 선언하여 해결함

### [2026-07-21] AnnouncementCard D-Day 카운트다운 전체 카드 리렌더링 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 1초 타이머 작동 시 AnnouncementCard 전체 컴포넌트가 재렌더링되는 성능 저하 발생함
* **원인 (Cause)**: 1초 간격의 타이머 state가 메인 카드 컴포넌트에 직접 포함되어 있었음
* **해결 (Solution)**: 카운트다운 타이머 로직을 memoized 컴포넌트(CountdownTimer)로 격리 분리함

### [2026-07-22] 북마크 API 호출 시 ON CONFLICT 복합키 불일치 오류 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 북마크 저장 및 폴더 생성 시 복합키 UNIQUE 제약 조건 불일치로 500 서버 에러가 발생함
* **원인 (Cause)**: 배포 서버의 SQLite user_data.db 테이블 제약 조건이 API 쿼리 내 ON CONFLICT 컬럼 조합과 일치하지 않음
* **해결 (Solution)**: ON CONFLICT UPSERT 문을 제거하고 SELECT 조회 후 INSERT/UPDATE 분기 처리로 쿼리 구조를 대체함

### [2026-07-23] Sidebar.tsx 런타임 ReferenceError (onSelectComplex is not defined) 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: `onSelectComplex is not defined` ReferenceError로 런타임 비정상 종료됨
* **원인 (Cause)**: `ComplexTab` 의 Props 타입 정의부에는 속성을 추가했으나 컴포넌트 매개변수 구조분해할당에서 누락함
* **해결 (Solution)**: 구조분해할당 인자에 `onSelectComplex`, `activeComplexId` 등을 명시적으로 추가하여 참조 오류를 해결함

### [2026-07-23] 단지 상세 패널 내 연관 공고 아코디언 토글 시 리셋 및 미작동 버그 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 상세 패널 내의 공고 카드 아코디언이 접히지 않거나 항상 펼쳐진 채로 나옴
* **원인 (Cause)**: `useEffect` 의 디펜던시가 객체 참조 `[complex]` 로 잡혀있어 렌더링 시 아코디언 로컬 상태가 강제 리셋됨
* **해결 (Solution)**: 디펜던시를 고유 ID 원시값 `[complex?.id]` 로 수정하고, `isAnnActive` 상태를 분리해 카드 클릭 시 접기 토글이 활성화되도록 패치함

### [2026-07-23] 단지 선택 해제 시 주소창이 엉뚱한 공고 ID로 스위칭되는 동기화 버그 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 단지 해제 시 주소창 URL이 `?announcement_id=3` 으로 튀어버림
* **원인 (Cause)**: `compIdParam` 주소 변경을 감지하는 `useEffect`가 연관 공고 ID를 덮어쓰고, 해제 시 이전 상태 롤백 분기를 탄 것이 원인임
* **해결 (Solution)**: 단지 탭(`COMPLEX`) 상태에서 카드를 해제할 때 공고 ID 상태를 `null` 로 정화하고 주소를 `/` 로 강제 롤백 처리함

### [2026-07-23] 사이드바 탭 전환 시 상세 패널 및 주소 쿼리 꼬임 버그 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 공고/단지 패널이 열린 상태에서 다른 탭으로 넘어가도 URL 쿼리가 지워지지 않고 남아있음
* **원인 (Cause)**: 탭 셀렉터 `handleTabSelect` 내에 상세 정보 및 주소 파라미터 소거 로직이 부재함
* **해결 (Solution)**: `handleTabSelect` 에 탭 스위칭 감지 구문을 추가하여, 탭 전환 시 모든 상세 패널을 닫고 URL을 `/` 로 즉시 정화함

### [2026-07-23] Native replaceState 사용으로 인한 새로고침 쿼리 복원(좀비) 오류 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 패널을 닫아 주소창이 `/` 인 상태에서 새로고침 시 이전 쿼리가 주소창에 다시 강제 주입됨
* **원인 (Cause)**: Native `replaceState` 조작을 Next.js Router가 감지하지 못해 메모리 상의 searchParams 쿼리가 새로고침 시 복구됨
* **해결 (Solution)**: Native API 호출을 Next.js 공식 `router.replace` 로 일제히 교체하여 해결함

### [2026-07-23] 새로고침 시 쿼리 복구와 URL 청소 간의 레이스 컨디션 비주얼 깜빡임 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 쿼리가 묻어있는 상태로 새로고침 시 상세 패널이 순간 열렸다가 닫히며 화면이 흔들림
* **원인 (Cause)**: URL 쿼리를 감지해 공고/단지를 강제 활성화해주던 `useEffect` 훅이 비동기 URL 청소 훅보다 먼저 기동함
* **해결 (Solution)**: URL 파라미터를 읽어 단지/공고를 강제 자동 활성화해주던 `useEffect` 감지 훅 2개를 완전히 삭제하여 해결함
