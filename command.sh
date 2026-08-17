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

function deploy() {
  echo "📍 [1/5] 신규 단지 네이버 지오코딩(위경도 좌표) 확인 및 갱신..."
  NODE_PATH="$BASE_DIR/web/node_modules" node "$BASE_DIR/db-pipeline/scripts/migrate_coords.js"

  echo "🚀 [2/5] Next.js Standalone 배포 패키지 빌드 시작..."
  npm --prefix "$BASE_DIR/web" run build:pack

  echo "📦 [3/5] 웹 빌드 번들 전송 중 (announce_deploy.tar.gz)..."
  scp -i "$KEY_PATH" "$BASE_DIR/web/announce_deploy.tar.gz" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/web/announce_deploy.tar.gz"

  echo "🗄️ [4/5] 최신 공고 데이터베이스 전송 중 (public_housing.db)..."
  scp -i "$KEY_PATH" "$BASE_DIR/db-pipeline/public_housing.db" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/db-pipeline/public_housing.db"

  echo "🔄 [5/5] 실서버 압축 해제 및 PM2 무중단 리로드..."
  ssh -i "$KEY_PATH" "$SERVER_USER@$SERVER_HOST" "cd $REMOTE_PATH/web && tar -xzf announce_deploy.tar.gz && pm2 reload pleasehome"

  echo "✅ 배포가 성공적으로 완료되었습니다!"
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
  deploy)
    deploy
    ;;
  geocode)
    geocode
    ;;
  pack)
    npm --prefix "$BASE_DIR/web" run build:pack
    ;;
  status|db:status)
    db_status
    ;;
  *)
    echo "사용법: ./command.sh [명령어]"
    echo "  deploy     : 네이버 지오코딩 + Next.js 번들 빌드 + DB 전송 + PM2 무중단 원클릭 배포"
    echo "  geocode    : 좌표가 누락된(NULL) 신규 단지 네이버 지오코딩만 단독 실행"
    echo "  pack       : web/announce_deploy.tar.gz 로컬 압축 빌드만 수행"
    echo "  db:status  : 로컬 public_housing.db 적재 현황 요약 조회"
    ;;
esac