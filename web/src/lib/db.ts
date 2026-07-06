import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(process.cwd(), '..', 'db-pipeline', 'public_housing.db');
export const db = new Database(dbPath, { verbose: console.log });

db.pragma('journal_mode = DELETE');
// 동시 조회를 원활하게 하기 위해 WAL(Write-Ahead Logging) 모드 활성화 및 락 대기시간(5초) 설정
// db.pragma('journal_mode = WAL');
// db.pragma('busy_timeout = 5000');

