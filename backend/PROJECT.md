# backend PROJECT.md

이 문서는 **PleaseHome 백엔드 코어 서버(`backend`)의 단일 진실 공급원(SSOT)**입니다.

---

## 1. 개요 및 아키텍처 원칙

`backend`는 Kotlin 및 Spring Boot 기반의 독립 RESTful API 코어 서버입니다. 영속 계층을 추상화하여 공고 조회 및 회원 트랜잭션을 안정적으로 처리하고, 경량 메모리 정책과 동시성 락 방어 설계를 갖추고 있습니다.

* **Dual DataSource 물리 분리 및 경량 커넥션 풀**:
  * `HousingDataSource`: `db-pipeline/public_housing.db` (공고 원장, Read-Only 전용, Hikari maxPoolSize=5, cache_size=-16000[16MB])
  * `MemberDataSource`: `db-pipeline/user_data.db` (회원/찜/숨김/북마크, Read-Write, Hikari maxPoolSize=3, cache_size=-8000[8MB])
* **SQLite 동시성 락 방어**:
  * `PRAGMA busy_timeout = 15000;` 연결 초기화 설정으로 락 경합 시 즉각 실패 방지.
  * 조회 로직(특히 로그인 `AuthService.login()`)에 `@Transactional(readOnly = true)`를 적용하여 불필요한 SQLite 독점 쓰기 락 방지.
* **Caffeine 인메모리 캐싱**:
  * 공고 목록 및 상세 데이터에 대해 최대 상한(1,000건)과 만료 TTL(6시간, `expireAfterWrite`)을 지정하여 저사양 인스턴스(1GB RAM)의 OOM 및 메모리 고착화 방지.
* **경량 런타임 최적화**:
  * JVM 힙 메모리 최적화(`-Xms128m -Xmx320m`) 및 PM2 프로세스 매니저 무중단 구동.

---

## 2. 기술 스택 및 디렉토리 구조

* **언어 및 런타임**: Kotlin 2.3.21, Java (OpenJDK 17+)
* **프레임워크**: Spring Boot 4.1.1, Spring Data JPA, Spring Security Crypto 6.x
* **데이터베이스 드라이버**: SQLite JDBC 3.47.1.0, Hibernate Community Dialects 6.6.9.Final

```text
backend/
├── build.gradle.kts          # 빌드 및 의존성 명세 (Spring Boot 4.1.1)
├── src/
│   ├── main/
│   │   ├── kotlin/com/pleasehome/
│   │   │   ├── admin/        # 관리자 통계 및 회원 활동 조회 컨트롤러/서비스/인터셉터
│   │   │   ├── common/       # 전역 예외 처리기 (GlobalExceptionHandler)
│   │   │   ├── config/       # DataSource 분리, SQLite PRAGMA, WebConfig(CORS), CacheConfig
│   │   │   ├── housing/      # 공고 및 단지 도메인 (엔티티, 레포지토리, 서비스, 컨트롤러)
│   │   │   └── member/       # 회원 인증 및 찜/숨김/북마크 도메인
│   │   └── resources/
│   │       └── application.yml
│   └── test/                 # 단위 및 통합 테스트
└── gradlew                   # Gradle 래퍼
```

---

## 3. 핵심 REST API 도메인 요약

1. **공고 및 단지 도메인 (6개)**:
   * `GET /api/announcements`: 전체 공고 목록 조회 (본문 details 제외 경량화)
   * `GET /api/announcements/{id}`: 공고 단건 기본 정보 조회
   * `GET /api/announcements/{id}/details`: 공고 상세 7대 섹션 온디맨드 조회
   * `GET /api/complexes`: 단지 목록 조회 (공고 ID 또는 단지 ID 배열 필터 지원)
   * `GET /api/complexes/{id}`: 단지 단건 기본 정보 조회
   * `GET /api/complexes/{id}/details`: 단지 상세 및 과거 동일 단지 이력 조회
   * `GET /api/housing-units`: 주택형 세부 조건 조회
   * `GET /api/sitemap/paths`: 검색엔진 색인용 경로 목록
2. **캐시 관리 도메인 (1개)**:
   * `POST /api/cache/evict`: 주택 공고/단지 인메모리 캐시 일괄 무효화 (localhost 전용)
3. **인증 및 회원 관리 도메인 (7개)**:
   * `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
   * `GET /api/auth/me`, `PATCH /api/auth/update`, `GET/POST /api/auth/find-account`
   * `DELETE /api/auth/account`: 회원 탈퇴 및 관련 데이터 일괄 삭제
4. **사용자 인터랙션 도메인 (10개)**:
   * 찜하기 (상호 배제): `GET/POST/DELETE /api/member/favorites` (숨김 등록 시 자동 해제)
   * 숨기기 (상호 배제): `GET/POST/DELETE /api/member/hidden-anns` (찜 등록 시 자동 해제)
   * 북마크 폴더: `GET/POST/DELETE /api/member/bookmark-folders`
   * 북마크 단지: `GET/POST/DELETE /api/member/bookmark-items`
5. **관리자 도메인 (3개, X-Admin-Api-Key 인증)**:
   * `GET /api/admin/stats`: 전역 통계 (회원수, 북마크수, 인기 단지/공고 TOP 10)
   * `GET /api/admin/users`: 회원 목록 및 활동 요약 조회 (페이징, 검색)
   * `GET /api/admin/users/{memberId}/activity`: 특정 회원 활동 상세 조회

---

## 4. 실행 및 빌드 명령어

```bash
# 개발 서버 기동 (포트 8080)
./command.sh backend:run
# 또는 직접 실행: cd backend && ./gradlew bootRun

# 단위 및 통합 테스트 실행
./command.sh backend:test
# 또는 직접 실행: cd backend && ./gradlew test

# 배포용 jar 빌드
./command.sh backend:build
```
