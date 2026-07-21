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
* **해결 (Solution)**: 지도를 감싸는 div 클래스명을 app-map-container로 수정하여 화면 전체 레이아웃을 복구함


