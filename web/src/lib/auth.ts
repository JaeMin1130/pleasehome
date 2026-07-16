import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

const SESSION_COOKIE = 'ph_session';
const HMAC_SECRET = process.env.SESSION_SECRET || 'pleasehome-default-secret-change-in-prod';
const SALT_ROUNDS = 10;
// 영구 로그인: 1년 (초 단위)
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

// ── 비밀번호 해시 ──────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── 세션 토큰 (HMAC-SHA256 서명, memberId를 페이로드로) ──────────
function sign(memberId: string): string {
  const payload = Buffer.from(memberId).toString('base64url');
  const sig = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('base64url');
  // timing-safe 비교
  if (expected.length !== sig.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  return Buffer.from(payload, 'base64url').toString();
}

// ── 쿠키 조작 ─────────────────────────────────────────────────
export async function setSessionCookie(memberId: string) {
  const token = sign(memberId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ── 현재 로그인 회원 ID 반환 ───────────────────────────────────
export async function getSessionMemberId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

// ── DB에서 회원 조회 ───────────────────────────────────────────
export function getMemberById(id: string) {
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id) as
    | { id: string; pwd_hash: string; security_q: string; security_a: string; created_at: string }
    | undefined;
}
