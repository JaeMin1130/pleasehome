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

function getUserDatabasePath() {
  if (process.env.USER_DATABASE_PATH) return process.env.USER_DATABASE_PATH;
  
  let candidate = path.join(process.cwd(), '..', 'db-pipeline', 'user_data.db');
  if (fs.existsSync(candidate)) return candidate;

  candidate = path.join(process.cwd(), '..', '..', 'db-pipeline', 'user_data.db');
  if (fs.existsSync(candidate)) return candidate;

  return path.join(process.cwd(), '..', 'db-pipeline', 'user_data.db');
}

const dbPath = getDatabasePath();
const userDbPath = getUserDatabasePath();

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

function initializeUserDatabase() {
  try {
    const instance = new Database(userDbPath, { verbose: console.log });
    instance.pragma('journal_mode = DELETE');

    // Ensure member schema exists
    instance.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id          TEXT PRIMARY KEY,
        pwd_hash    TEXT NOT NULL,
        security_q  TEXT NOT NULL,
        security_a  TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS member_hidden_anns (
        member_id       TEXT NOT NULL,
        announcement_id INTEGER NOT NULL,
        hidden_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (member_id, announcement_id)
      );
      CREATE TABLE IF NOT EXISTS member_bookmark_folders (
        id          TEXT NOT NULL,
        member_id   TEXT NOT NULL,
        name        TEXT NOT NULL,
        color       TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, member_id)
      );
      CREATE TABLE IF NOT EXISTS member_bookmark_items (
        member_id   TEXT NOT NULL,
        complex_id  INTEGER NOT NULL,
        folder_id   TEXT NOT NULL,
        memo        TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (member_id, complex_id)
      );
      CREATE TABLE IF NOT EXISTS member_favorites (
        member_id       TEXT NOT NULL,
        announcement_id INTEGER NOT NULL,
        favorited_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (member_id, announcement_id)
      );
      CREATE INDEX IF NOT EXISTS idx_hidden_anns_member ON member_hidden_anns (member_id);
      CREATE INDEX IF NOT EXISTS idx_bookmark_folders_member ON member_bookmark_folders (member_id);
      CREATE INDEX IF NOT EXISTS idx_bookmark_items_member ON member_bookmark_items (member_id);
      CREATE INDEX IF NOT EXISTS idx_favorites_member ON member_favorites (member_id);
    `);

    return instance;
  } catch (err) {
    console.error(`🚨 [USER_DB_OPEN_FATAL] Failed to open User SQLite DB at path: [${userDbPath}]`);
    console.error(err);
    throw err;
  }
}

export const db = initializeDatabase();
export const userDb = initializeUserDatabase();


