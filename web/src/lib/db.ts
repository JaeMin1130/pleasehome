import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

function getDatabasePath() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  
  // 1. 기본 상대 경로 기준 시도 (CWD = /home/iru/app/pleasehome/web)
  let candidate = path.join(process.cwd(), '..', 'db-pipeline', 'public_housing.db');
  if (fs.existsSync(candidate)) return candidate;

  // 2. standalone 빌드 런타임 기준 (CWD가 .next/standalone/ 등으로 틀어질 경우 한 단계 더 상위 탐색)
  candidate = path.join(process.cwd(), '..', '..', 'db-pipeline', 'public_housing.db');
  if (fs.existsSync(candidate)) return candidate;

  // 3. 마지막 폴백
  return path.join(process.cwd(), '..', 'db-pipeline', 'public_housing.db');
}

const dbPath = getDatabasePath();

function initializeDatabase() {
  try {
    const instance = new Database(dbPath, { verbose: console.log });
    instance.pragma('journal_mode = DELETE');
    return instance;
  } catch (err) {
    console.error(`🚨 [DB_OPEN_FATAL] Failed to open SQLite DB at path: [${dbPath}]`);
    console.error(err);
    throw err;
  }
}

export const db = initializeDatabase();

// 동시 조회를 원활하게 하기 위해 WAL(Write-Ahead Logging) 모드 활성화 및 락 대기시간(5초) 설정
// db.pragma('journal_mode = WAL');
// db.pragma('busy_timeout = 5000');

