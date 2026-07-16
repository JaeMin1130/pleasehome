import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionMemberId } from '@/lib/auth';

// GET /api/member/hidden-anns — 숨긴 공고 목록 조회
export async function GET() {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const rows = db
    .prepare('SELECT announcement_id, hidden_at FROM member_hidden_anns WHERE member_id = ?')
    .all(memberId) as { announcement_id: number; hidden_at: string }[];

  return NextResponse.json(rows);
}

// POST /api/member/hidden-anns — 공고 숨기기
export async function POST(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { announcement_id } = await req.json();
  if (!announcement_id) return NextResponse.json({ error: 'announcement_id가 필요합니다.' }, { status: 400 });

  db.prepare(
    'INSERT OR IGNORE INTO member_hidden_anns (member_id, announcement_id) VALUES (?, ?)'
  ).run(memberId, announcement_id);

  return NextResponse.json({ success: true });
}

// DELETE /api/member/hidden-anns — 숨기기 해제
export async function DELETE(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { announcement_id } = await req.json();
  if (!announcement_id) return NextResponse.json({ error: 'announcement_id가 필요합니다.' }, { status: 400 });

  db.prepare(
    'DELETE FROM member_hidden_anns WHERE member_id = ? AND announcement_id = ?'
  ).run(memberId, announcement_id);

  return NextResponse.json({ success: true });
}
