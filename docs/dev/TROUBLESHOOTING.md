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

### [2026-08-27] Next.js Standalone 배포 시 Nginx 리버스 프록시 /api/ 직접 라우팅 및 CORS 해결
* **분류**: 인프라 / 백엔드
* **현상 (Problem)**: Kotlin + Spring Boot 백엔드 분리 후 실서버 배포 시 클라이언트 AJAX API 호출이 404/403으로 실패하여 공고 미출력 및 로그인 불가 발생
* **원인 (Cause)**: Next.js Standalone 배포 모드(`server.js`)에서 클라이언트의 동적 `fetch('/api/...')`가 rewrites 프록시를 정상적으로 경유하지 못함. 또한 백엔드 CORS allowed-origins에 프로덕션 도메인(`pleasehome.com`)이 누락됨
* **해결 (Solution)**: Nginx 설정에 `location /api/` 블록을 추가하여 Spring Boot(`http://127.0.0.1:8080`)로 직접 리버스 프록시하도록 구성하고, Spring Boot `application.yml` 및 `WebConfig.kt`에 `pleasehome.com` CORS 허용 및 `ResponseCookie(SameSite=Lax)`를 적용함

### [2026-08-28] 네이버/카카오 길찾기 목적지 좌표 역전 오류 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 길찾기 버튼 클릭 시 사용자 출발지 대신 목적지 좌표가 출발지로 설정되어 길찾기 실패함
* **원인 (Cause)**: 링크 쿼리 파라미터가 도착지(to, elat, elng) 대신 출발지(from, slat, slng)로 지정되어 있었음
* **해결 (Solution)**: 네이버는 elat/elng/etext, 카카오는 to/경도,위도로 목적지 파라미터를 교체하여 해결함

### [2026-08-28] useBottomSheetGesture 탭 토글 시 TypeScript 타입 Narrowing 불일치 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: next build 시 TS 타입 narrowing 불일치로 Type error(types '1 | 2' and '0' have no overlap) 발생함
* **원인 (Cause)**: if-else 분기문으로 인해 nextState의 타입 추론이 1 | 2로 제한되어 0 비교문이 unreachable로 처리됨
* **해결 (Solution)**: 삼항 연산자를 활용하여 0, 1, 2 순환 삼항식을 구성해 타입 정의를 명확히 일치시킴

### [2026-09-06] LH OpenAPI 공고 수집 시 네트워크 무한 대기(프리징) 오류 해결
* **분류**: 파이프라인
* **현상 (Problem)**: `./command.sh notice:fetch` 실행 시 분양주택(05) 수집 후 임대주택(06) 조회 단계에서 아무런 에러 로그 없이 프로세스가 영구히 멈추는 프리징 현상 발생함
* **원인 (Cause)**: Python `requests.get()`에 `timeout` 인자가 지정되지 않아 기본값 `None`(무한 대기)으로 동작함. LH OpenAPI 서버에서 데이터 건수가 방대한 '임대주택' 유형 쿼리 시 응답 지연이나 커넥션 홀딩이 발생하여 I/O 블로킹 상태에 빠짐
* **해결 (Solution)**: `db-pipeline/src/lh_notice/api.py`에 공통 요청 헬퍼 `_request_api()`를 구현하여 연결/응답 기본 타임아웃(30초) 및 지연 발생 시 최대 2회 자동 재시도 로직을 적용함. 또한 원천 PDF/Excel 스트림 다운로드(`download_file`)에도 60초 타임아웃을 명시하여 네트워크 정체 시의 안전성을 확보함

### [2026-09-06] 실서버 백엔드 고부하 로그인 지연 및 SQLite 동시성 락/스왑 병목 해결
* **분류**: 인프라 / 백엔드
* **현상 (Problem)**: 실서버 사용자 증가 시 로그인이 극도로 지연되거나 먹통이 되며, `[SQLITE_BUSY] The database file is locked` 에러 및 HikariCP의 `Thread starvation or clock leap detected (housekeeper delta=50s ~ 3m)` 경고가 다수 발생함
* **원인 (Cause)**:
  1. **트랜잭션 독점**: `AuthService.kt` 클래스 레벨의 `@Transactional`로 인해 단순 조회 및 쿠키 발급을 수행하는 `login()` 호출 시에도 SQLite 독점 쓰기 락이 발생하고, CPU 집약적인 BCrypt 해시 검증 연산 동안 트랜잭션이 불필요하게 유지되어 락 경합이 가중됨
  2. **SQLite 대기 시간 부재**: `MemberDbConfig.kt` 및 `HousingDbConfig.kt`의 connectionInitSql에 `busy_timeout` 설정이 없어 동시 쓰기 발생 시 즉시 `SQLITE_BUSY` 500 에러를 반환함
  3. **1GB RAM 서버 스펙 한계 및 스왑 페이징**: 실서버가 1 vCPU / 961MB RAM 환경인데, Spring Boot 힙 메모리가 `-Xmx512m`로 과도하게 설정되어 디스크 스왑이 529MB까지 치솟음. 이로 인해 JVM 가비지 컬렉션(GC) 시 디스크 I/O 병목으로 전체 시스템이 수십 초~수 분간 동결(Stop-The-World)됨
  4. **디스크 임계치 도달**: 누적 로그 및 과거 배포 잔여물로 디스크 사용률이 92%(여유 774MB)에 달해 SQLite 저널 생성 및 OS 동작에 위험 요인이 됨
* **해결 (Solution)**:
  1. `AuthService.login()` 메서드에 `@Transactional(readOnly = true)`를 명시하여 쓰기 락 독점을 차단함
  2. `MemberDbConfig`와 `HousingDbConfig`에 `PRAGMA busy_timeout = 15000;`을 추가하여 동시성 락 충돌 방어망을 구축함
  3. 실서버 PM2 시작 스크립트를 `-Xms128m -Xmx320m`로 최적화하고 `backend.jar.new` 원자적 교체 방식을 도입하여, 스왑 메모리를 529MB에서 202MB로 62% 이상 대폭 다이어트하고 배포 시 `NoClassDefFoundError`를 차단함
  4. PM2 로그 비우기, 과거 `.tar.gz` 배포 파일 삭제, journalctl OS 저널 로그 및 APT 캐시 청소를 통해 디스크 여유 공간을 774MB(92%)에서 1.9GB(80%)로 1.1GB 이상 추가 확보함

### [2026-09-10] 대형 공고 LLM 출력 토큰 한도 초과로 인한 data.json 작성 중단 해결
* **분류**: 데이터 파이프라인
* **현상 (Problem)**: 150KB 이상의 거대 data.json 작성 시 에이전트 응답이 강제 중단(cut-off)되며 툴 호출 에러가 반복 발생함
* **원인 (Cause)**: LLM API의 1회 최대 출력 토큰 한도(약 20~25KB)를 초과하는 JSON 전문을 write_to_file 인자로 한 번에 출력하려 함
* **해결 (Solution)**: 기본정보·단지와 유닛·상세정보를 나누어 작성한 뒤 병합하는 2단계 분할 빌드(Chunked Build) 및 컴팩트 다이어트를 도입함

### [2026-09-10] 공고 상세 아코디언 본문 최상단 중복/어긋난 대제목 노출 오류 해결
* **분류**: 데이터 파이프라인
* **현상 (Problem)**: 공고 상세 아코디언 확장 시 탭 제목 바로 아래에 번호가 어긋난 마크다운 대제목(### N.)이 중복 노출되어 UI가 조잡해짐
* **원인 (Cause)**: section_title이 이미 탭 타이틀로 렌더링되는데 section_content 본문 첫 줄에 습관적으로 대제목을 중복 삽입함
* **해결 (Solution)**: 스킬 규약에 본문 최상단 대제목(#, ###) 삽입을 전면 금지하고 곧바로 핵심 불렛포인트 및 소제목으로 직결되도록 개선함

### [2026-09-12] 메인 에이전트의 단독 파이프라인 우회 및 독립 감사 누락 방지
* **분류**: 데이터 파이프라인
* **현상 (Problem)**: 대량 공고 적재 시 메인 에이전트가 서브에이전트 호출을 건너뛰고 단독으로 파이썬 스크립트를 실행하여 레거시 검증기로 인한 왜곡이 발생함
* **원인 (Cause)**: 메인 에이전트의 탐욕적 지름길(Greedy shortcut) 본능 및 적재 스크립트의 물리적 감사 통과 검증 장치(Hard Gate) 부재였음
* **해결 (Solution)**: `insert_loader.py`에 `audit_passed.token` 물리 게이트를 설치하고, `AGENTS.md`에 [누적 규칙 #10] 제정 및 제목 기반 정정공고 판별기(`detect_announcement_type.py`)를 구축함

### [2026-09-17] 로그인 후 공고 세팅 프리징 및 캐스케이딩 fetch 폭풍 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 로그인 직후 공고 및 단지 세팅 과정에서 극심한 프리징 및 네트워크 지연 발생함
* **원인 (Cause)**: Sidebar.tsx 내 미사용 bookmarkUnits의 의존성 누수로 O(N²) 캐스케이딩 fetch 폭풍 발생 및 useMemo 부재로 리렌더링마다 공고 정렬/카운트가 전수 반복 실행됨
* **해결 (Solution)**: 미사용 bookmarkUnits 상태와 fetch 이펙트를 전면 제거하고, 공고 정렬 및 5대 상태 카운트를 useMemo로 단일 순회 캐싱하여 연산 부하를 차단함

### [2026-09-23] 구글 색인 대량 누락 및 404 유입 이탈 해결
* **분류**: 웹 프론트엔드 / SEO
* **현상 (Problem)**: Search Console 기준 3,181개 페이지 미색인(449개만 색인). 네이버는 정상 색인되는데 구글만 실패함. 동시에 GA4에서 "404: This page could not be found"가 인기 페이지 6위(조회수 410, 이탈률 68.8%)로 잡힘
* **원인 (Cause)**:
  1. **고정 canonical**: `layout.tsx`에 `<link rel="canonical" href="https://pleasehome.com/">`가 고정값으로 박혀 있어, 공고/단지 상세 등 모든 하위 페이지가 홈페이지를 canonical로 선언한 셈이 되어 구글이 전부 홈페이지의 중복으로 취급해 색인 제외함. 네이버는 canonical 반영이 상대적으로 약해 영향을 덜 받음
  2. **404 유입/이탈**: 루트(`app/`)와 `complexes/[complexId]/`에 커스텀 `not-found.tsx`가 없어 Next.js 기본 흰 화면 404로 떨어짐 (홈으로 돌아가는 링크 없음)
  3. **리다이렉트 맵 누락**: 단지 병합 마이그레이션 `011_merge_residual_complex_duplicates.py`가 병합한 단지 2건(`1315→3671`, `1217→2463`)이 `complex_redirect_map.json`에 반영 안 됨 — 이미 색인됐던 옛 단지 URL이 리다이렉트 없이 그대로 404가 됨
* **해결 (Solution)**:
  1. 루트 레이아웃의 고정 canonical 태그 제거, 홈(`page.tsx`)과 공고/단지 상세 `generateMetadata`에 각자 자기 URL을 가리키는 `alternates.canonical`을 페이지별로 명시
  2. `web/src/app/not-found.tsx` + `not-found.module.css` 신설(홈 복귀 링크 포함) — 루트에 두어 하위 라우트 전부가 상속받도록 함
  3. `complex_redirect_map.json`에 누락된 011번 병합분 2건 추가
  4. 재발 방지를 위해 [AGENTS.md 누적 규칙 #11](../../AGENTS.md)에 "단지 병합 마이그레이션 작성 시 redirect map 동시 갱신 의무"를 명문화함

### [2026-10-15] 홈 화면 8MB 거대 페이로드 프리징 및 캐시 메모리 누수 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 서비스 첫 로딩 시 수 초간 극심한 화면 프리징이 발생하고 서버 응답이 지연됨
* **원인 (Cause)**: 공고 목록 API가 본문 190만 자를 포함해 8MB HTML이 전송되고, 기본 캐시에 크기 상한이 없어 1GB RAM이 고갈됨
* **해결 (Solution)**: 목록 API에서 details를 제외해 카드 펼침 시 온디맨드로 로딩하고, Caffeine 캐시(상한 1000) 및 외부 캐시 무효화 차단을 적용함

### [2026-10-25] 파이프라인 서브에이전트의 임의 DB 접속으로 인한 0바이트 고스트 DB 파일 생성 해결
* **분류**: 데이터 파이프라인
* **현상 (Problem)**: `db-pipeline/` 하위에 `data.db`, `database.sqlite` 등 의도치 않은 0바이트 빈 DB 파일이 지속적으로 자동 생성됨
* **원인 (Cause)**: 추출 및 감사 서브에이전트가 공고 계보 및 단지 정보를 확인할 때, Python `sqlite3.connect()`로 임의의 가상 DB 경로(`data.db` 등)를 호출함. SQLite는 대상 파일 부재 시 즉시 0바이트 빈 파일을 생성하므로, 조회 실패 후 실제 DB(`public_housing.db`)로 전환하더라도 빈 파일이 잔류함
* **해결 (Solution)**: 기존 0바이트 고스트 파일들을 전수 정리하고, 스킬 명세(`extract-data`, `audit-data`)에 서브에이전트의 임의 DB 직접 `connect()`를 전면 금지하며 0단계 공식 판별기(`detect_announcement_type.py`)의 출력 JSON 결과만을 단일 소스로 참조하도록 규칙을 명문화함



