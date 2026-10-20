#!/usr/bin/env bash
set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_PATH="$BASE_DIR/db-pipeline/public-housing-key.pem"
SERVER_HOST="101.79.19.118"
SERVER_USER="iru"
REMOTE_PATH="/home/iru/app/pleasehome"
# 배포 중 ssh/scp 연결(10여 회)이 첫 인증 1회를 공유하도록 연결 재사용, 웹 빌드(수 분) 중에도 유지되도록 15분 유휴 시 자동 종료
SSH_OPTS=(-i "$KEY_PATH" -o ControlMaster=auto -o ControlPath="$HOME/.ssh/cm-%r@%h:%p" -o ControlPersist=15m)

PYTHON_BIN="$BASE_DIR/db-pipeline/.venv/bin/python3"
if [ ! -f "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

function geocode() {
  echo "📍 신규 단지 네이버 지오코딩(위경도 좌표) 확인 및 갱신..."
  NODE_PATH="$BASE_DIR/web/node_modules" node "$BASE_DIR/db-pipeline/scripts/migrate_coords.js"
}

function require_clean_git() {
  # 배포물 = 특정 커밋이 되도록, 커밋되지 않은 변경이 있으면 중단
  if [ -n "$(git -C "$BASE_DIR" status --porcelain)" ]; then
    echo "❌ 커밋되지 않은 변경이 있어 배포를 중단합니다. 커밋 후 다시 실행하세요."
    git -C "$BASE_DIR" status --short
    exit 1
  fi
}

function remote_health() {
  # $1: 이름, $2: 서버 내부 확인 URL, $3: 실패 시 안내할 롤백 명령
  if ! ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "for _ in \$(seq 1 90); do curl -sf -o /dev/null $2 && exit 0; sleep 1; done; exit 1"; then
    echo "❌ $1 헬스체크 실패 ($2, 90초 무응답)"
    echo "   롤백: ssh -i $KEY_PATH $SERVER_USER@$SERVER_HOST \"$3\""
    exit 1
  fi
  echo "💚 $1 헬스체크 통과"
}

function deploy_db() {
  local restart="${1:-restart}"
  local snapshot="$BASE_DIR/db-pipeline/public_housing.snapshot.db"

  echo "📍 [DB 배포 1/3] 신규 단지 네이버 지오코딩 확인 및 갱신..."
  geocode

  echo "📸 [DB 배포 2/3] 일관 스냅샷 생성 및 무결성 검사..."
  # .db만 복사하면 -wal에 남은 최근 적재분이 빠지므로 SQLite 백업 API로 스냅샷을 뜬다
  rm -f "$snapshot"
  sqlite3 "$BASE_DIR/db-pipeline/public_housing.db" ".backup '$snapshot'"
  [ "$(sqlite3 "$snapshot" 'PRAGMA integrity_check')" = "ok" ] || { echo "❌ 스냅샷 무결성 검사 실패"; exit 1; }

  echo "📦 [DB 배포 3/3] 스냅샷 전송 후 백엔드 정지 상태에서 교체..."
  ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_PATH/db-pipeline"
  scp "${SSH_OPTS[@]}" "$snapshot" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/db-pipeline/public_housing.db.new"
  rm -f "$snapshot"
  # 열린 DB를 덮어쓰지 않도록 정지 후 교체하고, 옛 DB의 -wal/-shm이 새 DB에 섞이지 않게 지운다
  ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "
    set -e
    cd $REMOTE_PATH/db-pipeline
    pm2 stop pleasehome-backend 2>/dev/null || true
    [ ! -f public_housing.db ] || cp -f public_housing.db public_housing.db.prev
    mv -f public_housing.db.new public_housing.db
    rm -f public_housing.db-wal public_housing.db-shm
  "

  # 통합 배포(deploy)에서는 곧이어 새 JAR로 기동하므로 재시작을 건너뛴다
  if [ "$restart" = "restart" ]; then
    ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "pm2 restart pleasehome-backend"
    remote_health "백엔드" "http://127.0.0.1:8080/api/sitemap/paths" \
      "cd $REMOTE_PATH/db-pipeline && cp -f public_housing.db.prev public_housing.db && rm -f public_housing.db-wal public_housing.db-shm && pm2 restart pleasehome-backend"
  fi
  echo "✅ 데이터베이스(public_housing.db) 배포가 완료되었습니다!"
}

function upload_backend() {
  require_clean_git
  echo "☕ [백엔드 배포 1/3] Spring Boot JAR 패키징 빌드..."
  "$BASE_DIR/backend/gradlew" -p "$BASE_DIR/backend" build -x test

  echo "📦 [백엔드 배포 2/3] JAR 파일 실서버 전송 중..."
  ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_PATH/backend"
  scp "${SSH_OPTS[@]}" "$BASE_DIR/backend/build/libs/backend-0.0.1-SNAPSHOT.jar" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/backend/backend.jar.new"
}

function activate_backend() {
  echo "🔄 [백엔드 배포 3/3] 실서버 Spring Boot PM2 재시작..."
  ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "
    set -e
    cd $REMOTE_PATH/backend
    [ ! -f backend.jar ] || cp -f backend.jar backend.jar.prev
    mv -f backend.jar.new backend.jar
    pm2 delete pleasehome-backend 2>/dev/null || true
    [ -s .session_secret ] || (umask 077 && openssl rand -hex 32 > .session_secret)
    SESSION_SECRET=\$(cat .session_secret) pm2 start 'java -Djava.security.egd=file:/dev/./urandom -Xms128m -Xmx256m -XX:+UseSerialGC -XX:ReservedCodeCacheSize=48m -XX:MaxMetaspaceSize=128m -Xss512k -jar backend.jar' --name pleasehome-backend --cwd $REMOTE_PATH/backend
    pm2 save
    echo $(git -C "$BASE_DIR" rev-parse --short HEAD) > .deployed_rev
  "
  remote_health "백엔드" "http://127.0.0.1:8080/api/sitemap/paths" \
    "cd $REMOTE_PATH/backend && cp -f backend.jar.prev backend.jar && pm2 restart pleasehome-backend"
  echo "✅ 백엔드(Spring Boot) 배포가 완료되었습니다!"
}

function deploy_backend() {
  upload_backend
  activate_backend
}

function deploy_web() {
  require_clean_git
  echo "🚀 [프론트 배포 1/3] Next.js Standalone 배포 패키지 빌드..."
  # 홈 페이지는 빌드 시 백엔드 데이터로 미리 그려지므로, 현재 코드로 만든 백엔드를 직접 띄워 빌드한다
  if fuser 8080/tcp >/dev/null 2>&1; then
    echo "❌ 로컬 8080 포트가 이미 사용 중입니다. 옛 코드의 백엔드로 빌드되는 것을 막기 위해 중단합니다. 해당 프로세스를 종료 후 다시 실행하세요."
    exit 1
  fi
  "$BASE_DIR/backend/gradlew" -p "$BASE_DIR/backend" build -x test
  # DB 경로(../db-pipeline)가 실행 위치 기준이라 backend/에서 띄운다
  (cd "$BASE_DIR/backend" && exec java -Xms256m -Xmx512m -jar build/libs/backend-0.0.1-SNAPSHOT.jar >/dev/null 2>&1) &
  local backend_pid=$!
  trap "kill $backend_pid 2>/dev/null || true" EXIT
  for _ in $(seq 1 60); do curl -sf http://127.0.0.1:8080/api/sitemap/paths >/dev/null && break; sleep 1; done
  curl -sf -o /dev/null http://127.0.0.1:8080/api/sitemap/paths || { echo "❌ 로컬 백엔드가 60초 안에 응답하지 않습니다."; exit 1; }
  npm --prefix "$BASE_DIR/web" run build:pack
  kill "$backend_pid" 2>/dev/null || true

  echo "📦 [프론트 배포 2/3] 빌드 번들 실서버 전송 중 (직전 번들은 롤백용으로 보관)..."
  ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_PATH/web && cd $REMOTE_PATH/web && { [ ! -f announce_deploy.tar.gz ] || mv -f announce_deploy.tar.gz announce_deploy.prev.tar.gz; }"
  scp "${SSH_OPTS[@]}" "$BASE_DIR/web/announce_deploy.tar.gz" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/web/announce_deploy.tar.gz"

  echo "🔄 [프론트 배포 3/3] 실서버 웹(Next.js) 압축 해제 및 PM2 리로드..."
  ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "
    set -e
    cd $REMOTE_PATH/web
    tar -xzf announce_deploy.tar.gz
    pm2 reload pleasehome
    echo $(git -C "$BASE_DIR" rev-parse --short HEAD) > .deployed_rev
  "
  remote_health "웹" "http://127.0.0.1:3000/" \
    "cd $REMOTE_PATH/web && tar -xzf announce_deploy.prev.tar.gz && pm2 reload pleasehome"
  echo "✅ 프론트엔드(Next.js) 배포가 완료되었습니다!"
}

function deploy() {
  echo "🚀 [통합 배포 시작] 백엔드 업로드 -> DB 교체 -> 백엔드 기동 -> 프론트엔드 순차 배포..."
  # 백엔드 재시작을 1회로 줄이고 새 DB를 옛 JAR이 읽는 구간을 없애기 위해, JAR을 먼저 올려 두고 DB 교체 직후 새 JAR로 기동한다
  upload_backend
  deploy_db no-restart
  activate_backend
  deploy_web
  echo "🎉 프론트엔드 + 백엔드 + DB 전체 통합 배포가 성공적으로 완료되었습니다!"
}

function db_status() {
  echo "📊 SQLite Database Status:"
  "$PYTHON_BIN" -c "
import sqlite3
conn = sqlite3.connect('$BASE_DIR/db-pipeline/public_housing.db')
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM announcements'); print('Announcements:', c.fetchone()[0])
c.execute('SELECT COUNT(*) FROM complexes'); print('Complexes:    ', c.fetchone()[0])
c.execute('SELECT COUNT(*) FROM housing_units'); print('Housing Units:', c.fetchone()[0])
"
}

function log_stats() {
  # 실서버 pm2 로그의 WARN/ERROR를 일자별·메시지 유형별로 집계 (읽기 전용)
  local days="${1:-1}"
  if ! [[ "$days" =~ ^[0-9]+$ ]]; then
    echo "❌ 일수는 숫자여야 합니다. 사용법: ./command.sh logs:stats [최근 일수, 기본 1]"
    return 1
  fi
  ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" bash -s -- "$days" <<'REMOTE'
days="$1"
since=$(date -d "-$days days" +%F)
log_dir="$HOME/.pm2/logs"
backend_log="$log_dir/pleasehome-backend-out.log"
web_log="$log_dir/pleasehome-error.log"
# 현재 파일 + 아직 logs:pull로 받아 가지 않은 날짜별 교체본(*.log-YYYY-MM-DD.gz)을 날짜순으로 이어 읽는다
read_log() { zcat -f "$1"-*.gz "$1" 2>/dev/null; }

echo "📊 [백엔드] $since 이후 WARN/ERROR ($backend_log)"
if [ -f "$backend_log" ]; then
  # Spring 기본 형식: "2026-10-13T19:55:24.734+09:00  WARN 475622 --- [app] [thread] logger : 메시지"
  # 메시지의 숫자는 N으로 바꿔 같은 유형끼리 묶는다 (스택 트레이스 줄은 제외)
  awk -v since="$since" '
    /^20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]T/ && ($2 == "WARN" || $2 == "ERROR") && substr($1, 1, 10) >= since {
      daily[substr($1, 1, 10) " " $2]++
      msg = substr($0, index($0, " : ") + 3)
      gsub(/[0-9][0-9a-zµ]*/, "N", msg)
      types[$2 " | " substr(msg, 1, 110)]++
    }
    END {
      print "  - 일자별"
      for (k in daily) print "    " k ": " daily[k] | "sort"
      close("sort")
      print "  - 유형별 상위 15개"
      for (k in types) print types[k] "\t" k | "sort -rn | head -15 | sed \"s/^/    /\""
    }' <(read_log "$backend_log")
else
  echo "  로그 파일 없음"
fi

echo ""
echo "📊 [웹] $since 이후 에러 ($web_log)"
if [ -f "$web_log" ]; then
  # pm2 --time 형식: "2026-10-20T21:08:15: 메시지". 시각 없는 줄은 앞 줄에 이어진 스택·객체 덤프로 보고 제외하되,
  # --time 적용(2026-10-20) 이전에 쌓인 줄(첫 시각 줄보다 앞)은 날짜를 알 수 없어 건수만 따로 센다
  awk -v since="$since" '
    /^20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]: / {
      seen = 1
      day = substr($0, 1, 10)
      msg = substr($0, 22)
      if (day < since || msg ~ /^[ \t{}]/) next
      daily[day]++
      gsub(/[0-9][0-9a-zµ]*/, "N", msg)
      types[substr(msg, 1, 110)]++
      next
    }
    !seen && !/^[ \t{}]/ { legacy++ }
    END {
      print "  - 일자별"
      for (k in daily) print "    " k ": " daily[k] | "sort"
      close("sort")
      print "  - 유형별 상위 10개"
      for (k in types) print types[k] "\t" k | "sort -rn | head -10 | sed \"s/^/    /\""
      close("sort -rn | head -10 | sed \"s/^/    /\"")
      if (legacy) print "  (시각 기록 이전 줄 " legacy "건은 날짜를 알 수 없어 집계 제외)"
    }' <(read_log "$web_log")
else
  echo "  로그 파일 없음"
fi
REMOTE
}

function log_pull() {
  # 서버 logrotate가 날짜별로 떼어 둔 로그(*.log-YYYY-MM-DD.gz)를 logs/archive/<날짜>/로 받고,
  # 크기 일치와 gzip 무결성을 확인한 파일만 서버에서 지운다. 지금 쓰이는 *.log는 건드리지 않는다.
  local remote_dir="/home/$SERVER_USER/.pm2/logs"
  local dest="$BASE_DIR/logs/archive"
  local files
  files=$(ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" \
    "cd $remote_dir && ls -1 -- *.log-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].gz 2>/dev/null" || true)
  if [ -z "$files" ]; then
    echo "📭 받을 날짜별 로그가 없습니다. (서버 logrotate가 아직 돌지 않았거나 이미 모두 받음)"
    return 0
  fi

  local f day remote_size local_size pulled=0
  for f in $files; do
    day="${f##*.log-}"
    day="${day%.gz}"
    mkdir -p "$dest/$day"
    scp -q "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST:$remote_dir/$f" "$dest/$day/$f"
    remote_size=$(ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "stat -c %s $remote_dir/$f")
    local_size=$(stat -c %s "$dest/$day/$f")
    if [ "$remote_size" = "$local_size" ] && gzip -t "$dest/$day/$f"; then
      ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "rm -f -- $remote_dir/$f"
      echo "✅ $day/$f ($local_size bytes) 받음 → 서버에서 삭제"
      pulled=$((pulled + 1))
    else
      echo "⚠️  $f 검증 실패(서버 $remote_size / 로컬 $local_size bytes) → 서버 파일 유지"
    fi
  done
  echo "📦 $pulled개 파일을 $dest 에 보관했습니다."
}

function fetch_notices() {
  local start_date="$1"
  local end_date="$2"
  shift 2 2>/dev/null || true

  if [ -z "$start_date" ] || [ -z "$end_date" ]; then
    echo "❌ 시작일과 종료일이 필요합니다."
    echo "사용법: ./command.sh notice:fetch <시작일(YYYY-MM-DD)> <종료일(YYYY-MM-DD)> [추가옵션...]"
    echo "예시:   ./command.sh notice:fetch 2026-09-01 2026-09-03"
    return 1
  fi

  echo "📥 [공고 수집] LH OpenAPI 공고 및 첨부파일 다운로드 ($start_date ~ $end_date, 수도권: 서울/경기/인천)..."
  "$PYTHON_BIN" "$BASE_DIR/db-pipeline/src/lh_notice/main.py" --start-date "$start_date" --end-date "$end_date" "$@"
}

function convert_pdf() {
  echo "📄 [PDF 변환] 마크다운 변환 및 표준화 실행..."
  "$PYTHON_BIN" "$BASE_DIR/.agents/scripts/convert_pdf_to_md.py" "$@"
}

case "$1" in
  # --- 백엔드 (Kotlin + Spring Boot) ---
  backend:run|backend:dev)
    "$BASE_DIR/backend/gradlew" -p "$BASE_DIR/backend" bootRun
    ;;
  backend:test)
    "$BASE_DIR/backend/gradlew" -p "$BASE_DIR/backend" test
    ;;
  backend:build)
    "$BASE_DIR/backend/gradlew" -p "$BASE_DIR/backend" build -x test
    ;;

  # --- 프론트엔드 (Next.js) ---
  web:run|web:dev)
    npm --prefix "$BASE_DIR/web" run dev
    ;;
  web:build)
    npm --prefix "$BASE_DIR/web" run build
    ;;
  web:start)
    npm --prefix "$BASE_DIR/web" run start
    ;;

  # --- 데이터 파이프라인 & 배포 ---
  notice:fetch|fetch:notice|fetch)
    fetch_notices "$2" "$3" "${@:4}"
    ;;
  pdf:convert|convert:pdf|convert)
    convert_pdf "${@:2}"
    ;;
  geocode)
    geocode
    ;;
  pack)
    npm --prefix "$BASE_DIR/web" run build:pack
    ;;
  deploy:db|db:deploy)
    deploy_db
    ;;
  deploy:backend|backend:deploy)
    deploy_backend
    ;;
  deploy:web|web:deploy|deploy:front|front:deploy)
    deploy_web
    ;;
  deploy|deploy:all)
    deploy
    ;;
  status|db:status)
    db_status
    ;;
  logs:stats|log:stats)
    log_stats "$2"
    ;;
  logs:pull|log:pull)
    log_pull
    ;;
  *)
    echo "사용법: ./command.sh [명령어]"
    echo ""
    echo "  [백엔드 - Kotlin + Spring Boot]"
    echo "    backend:run      : Spring Boot API 서버 로컬 실행 (포트 8080)"
    echo "    backend:test     : 백엔드 전체 REST API & 트랜잭션 통합 테스트"
    echo "    backend:build    : 백엔드 JAR 패키징 빌드"
    echo ""
    echo "  [프론트엔드 - Next.js]"
    echo "    web:run          : Next.js 프론트엔드 개발 서버 실행 (포트 3000)"
    echo "    web:build        : Next.js 프로덕션 빌드"
    echo "    web:start        : Next.js 프로덕션 서버 실행"
    echo ""
    echo "  [데이터 수집 & 변환]"
    echo "    notice:fetch <시작일 yyyy-MM-dd> <종료일 yyyy-MM-dd> [추가옵션...] : LH OpenAPI 공고 및 원본 PDF/Excel 다운로드 (기본: 서울/경기/인천)"
    echo "    pdf:convert [대상폴더/파일]   : PDF 공고문을 마크다운(document.md)으로 변환"
    echo ""
    echo "  [배포 & 데이터 파이프라인]"
    echo "    deploy:web       : 프론트엔드(Next.js)만 단독 빌드 및 실서버 배포"
    echo "    deploy:backend   : 백엔드(Spring Boot)만 단독 빌드 및 실서버 배포"
    echo "    deploy:db        : SQLite DB(public_housing.db) 및 지오코딩만 실서버 배포"
    echo "    deploy           : DB + 백엔드 + 프론트엔드 원클릭 전체 통합 배포"
    echo "    geocode          : 좌표 누락 신규 단지 네이버 지오코딩 실행"
    echo "    db:status        : 로컬 SQLite 공고/단지 적재 현황 요약"
    echo ""
    echo "  [모니터링]"
    echo "    logs:stats [일수] : 실서버 백엔드/웹 로그의 WARN·ERROR 일자별·유형별 통계 (기본 최근 1일, 서버에 남은 로그 기준)"
    echo "    logs:pull         : 서버에서 날짜별로 교체된 로그를 logs/archive/<날짜>/로 받고 서버에서 삭제"
    ;;
esac