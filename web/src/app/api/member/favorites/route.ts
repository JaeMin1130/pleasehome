import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { getSessionMemberId } from '@/lib/auth';

// GET /api/member/favorites — 찜한 공고 목록 조회
export async function GET() {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const rows = userDb
    .prepare('SELECT announcement_id, favorited_at FROM member_favorites WHERE member_id = ?')
    .all(memberId) as { announcement_id: number; favorited_at: string }[];

  return NextResponse.json(rows);
}

// POST /api/member/favorites — 공고 찜하기
export async function POST(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { announcement_id } = await req.json();
  if (!announcement_id) return NextResponse.json({ error: 'announcement_id가 필요합니다.' }, { status: 400 });

  userDb.prepare(
    'INSERT OR IGNORE INTO member_favorites (member_id, announcement_id) VALUES (?, ?)'
  ).run(memberId, announcement_id);

  return NextResponse.json({ success: true });
}

// DELETE /api/member/favorites — 공고 찜 해제
export async function DELETE(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { announcement_id } = await req.json();
  if (!announcement_id) return NextResponse.json({ error: 'announcement_id가 필요합니다.' }, { status: 400 });

  userDb.prepare(
    'DELETE FROM member_favorites WHERE member_id = ? AND announcement_id = ?'
  ).run(memberId, announcement_id);

  return NextResponse.json({ success: true });
}
