#!/usr/bin/env bash
set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_PATH="$BASE_DIR/db-pipeline/public-housing-key.pem"
SERVER_HOST="101.79.19.118"
SERVER_USER="iru"
REMOTE_PATH="/home/iru/app/pleasehome"

function geocode() {
  echo "📍 신규 단지 네이버 지오코딩(위경도 좌표) 확인 및 갱신..."
  NODE_PATH="$BASE_DIR/web/node_modules" node "$BASE_DIR/db-pipeline/scripts/migrate_coords.js"
}

function deploy_db() {
  echo "📍 [DB 배포 1/2] 신규 단지 네이버 지오코딩 확인 및 갱신..."
  geocode

  echo "📦 [DB 배포 2/2] SQLite DB 파일 실서버 전송 중..."
  ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_PATH/db-pipeline"
  scp -i "$KEY_PATH" "$BASE_DIR/db-pipeline/public_housing.db" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/db-pipeline/public_housing.db"

  echo "🔄 실서버 백엔드 DB 커넥션 리프레시를 위해 백엔드 재시작..."
  ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "pm2 restart pleasehome-backend 2>/dev/null || true"
  echo "✅ 데이터베이스(public_housing.db) 배포가 완료되었습니다!"
}

function deploy_backend() {
  echo "☕ [백엔드 배포 1/3] Spring Boot JAR 패키징 빌드..."
  "$BASE_DIR/backend/gradlew" -p "$BASE_DIR/backend" build -x test

  echo "📦 [백엔드 배포 2/3] JAR 파일 실서버 전송 중..."
  ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_PATH/backend"
  scp -i "$KEY_PATH" "$BASE_DIR/backend/build/libs/backend-0.0.1-SNAPSHOT.jar" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/backend/backend.jar"

  echo "🔄 [백엔드 배포 3/3] 실서버 Spring Boot PM2 재시작..."
  ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "
    cd $REMOTE_PATH/backend
    pm2 restart pleasehome-backend 2>/dev/null || pm2 start 'java -Xms128m -Xmx256m -jar backend.jar' --name pleasehome-backend --cwd $REMOTE_PATH/backend
    pm2 save
  "
  echo "✅ 백엔드(Spring Boot) 배포가 완료되었습니다!"
}

function deploy_web() {
  echo "🚀 [프론트 배포 1/3] Next.js Standalone 배포 패키지 빌드..."
  fuser 8080/tcp >/dev/null 2>&1 || (nohup java -Xms128m -Xmx256m -jar "$BASE_DIR/backend/build/libs/backend-0.0.1-SNAPSHOT.jar" >/dev/null 2>&1 & sleep 4)
  npm --prefix "$BASE_DIR/web" run build:pack

  echo "📦 [프론트 배포 2/3] 빌드 번들 실서버 전송 중..."
  ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_PATH/web"
  scp -i "$KEY_PATH" "$BASE_DIR/web/announce_deploy.tar.gz" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/web/announce_deploy.tar.gz"

  echo "🔄 [프론트 배포 3/3] 실서버 웹(Next.js) 압축 해제 및 PM2 무중단 리로드..."
  ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "cd $REMOTE_PATH/web && tar -xzf announce_deploy.tar.gz && pm2 reload pleasehome"
  echo "✅ 프론트엔드(Next.js) 배포가 완료되었습니다!"
}

function deploy() {
  echo "🚀 [통합 배포 시작] DB -> 백엔드 -> 프론트엔드 순차 배포..."
  deploy_db
  deploy_backend
  deploy_web
  echo "🎉 프론트엔드 + 백엔드 + DB 전체 통합 배포가 성공적으로 완료되었습니다!"
}

function db_status() {
  echo "📊 SQLite Database Status:"
  python3 -c "
import sqlite3
conn = sqlite3.connect('$BASE_DIR/db-pipeline/public_housing.db')
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM announcements'); print('Announcements:', c.fetchone()[0])
c.execute('SELECT COUNT(*) FROM complexes'); print('Complexes:    ', c.fetchone()[0])
c.execute('SELECT COUNT(*) FROM housing_units'); print('Housing Units:', c.fetchone()[0])
"
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
    echo "  [배포 & 데이터 파이프라인]"
    echo "    deploy:web       : 프론트엔드(Next.js)만 단독 빌드 및 실서버 배포"
    echo "    deploy:backend   : 백엔드(Spring Boot)만 단독 빌드 및 실서버 배포"
    echo "    deploy:db        : SQLite DB(public_housing.db) 및 지오코딩만 실서버 배포"
    echo "    deploy           : DB + 백엔드 + 프론트엔드 원클릭 전체 통합 배포"
    echo "    geocode          : 좌표 누락 신규 단지 네이버 지오코딩 실행"
    echo "    db:status        : 로컬 SQLite 공고/단지 적재 현황 요약"
    ;;
esac