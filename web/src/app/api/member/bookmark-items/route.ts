import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { getSessionMemberId } from '@/lib/auth';

// GET /api/member/bookmark-items — 북마크 아이템 목록 조회
export async function GET() {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const items = userDb
    .prepare('SELECT complex_id, folder_id, memo, created_at FROM member_bookmark_items WHERE member_id = ? ORDER BY created_at ASC')
    .all(memberId);

  return NextResponse.json(items);
}

// POST /api/member/bookmark-items — 북마크 아이템 추가 또는 수정
export async function POST(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { complex_id, folder_id, memo } = await req.json();
  if (complex_id === undefined || complex_id === null || !folder_id) {
    return NextResponse.json({ error: 'complex_id, folder_id가 필요합니다.' }, { status: 400 });
  }

  const existing = userDb
    .prepare('SELECT 1 FROM member_bookmark_items WHERE member_id = ? AND complex_id = ?')
    .get(memberId, complex_id);

  if (existing) {
    userDb
      .prepare('UPDATE member_bookmark_items SET folder_id = ?, memo = ? WHERE member_id = ? AND complex_id = ?')
      .run(folder_id, memo ?? null, memberId, complex_id);
  } else {
    userDb
      .prepare('INSERT INTO member_bookmark_items (member_id, complex_id, folder_id, memo) VALUES (?, ?, ?, ?)')
      .run(memberId, complex_id, folder_id, memo ?? null);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/member/bookmark-items — 북마크 아이템 삭제
export async function DELETE(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { complex_id } = await req.json();
  if (complex_id === undefined || complex_id === null) {
    return NextResponse.json({ error: 'complex_id가 필요합니다.' }, { status: 400 });
  }

  userDb.prepare(
    'DELETE FROM member_bookmark_items WHERE member_id = ? AND complex_id = ?'
  ).run(memberId, complex_id);

  return NextResponse.json({ success: true });
}
