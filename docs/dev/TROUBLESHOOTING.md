# 트러블슈팅 및 문제 해결 기록 (Troubleshooting & Issue Logs)

### [2026-07-16] ignored 디렉토리 내 소스 코드 git add 오류 해결
* **분류**: 웹 프론트엔드
* **현상 (Problem)**: 최상위 .gitignore의 /* 규칙으로 인해 web/ 폴더 하위 소스 코드 git add 시 ignore 에러 발생함
* **원인 (Cause)**: 프로젝트 루트의 전체 파일 예외 설정이 web/ 디렉토리 내의 변경 및 신규 파일 스테이징을 차단함
* **해결 (Solution)**: 변경 대상이 순수 소스 코드이므로 git add -f 옵션을 활용하여 강제 스테이징 및 커밋 처리함
