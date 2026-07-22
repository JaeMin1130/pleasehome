import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { getSessionMemberId } from '@/lib/auth';

// GET /api/member/bookmark-folders — 북마크 폴더 목록 조회
export async function GET() {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const folders = userDb
    .prepare('SELECT id, name, color, created_at FROM member_bookmark_folders WHERE member_id = ? ORDER BY created_at ASC')
    .all(memberId);

  return NextResponse.json(folders);
}

// POST /api/member/bookmark-folders — 북마크 폴더 추가 또는 수정
export async function POST(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id, name, color } = await req.json();
  if (!id || !name || !color) {
    return NextResponse.json({ error: 'id, name, color가 필요합니다.' }, { status: 400 });
  }

  const existing = userDb
    .prepare('SELECT 1 FROM member_bookmark_folders WHERE id = ? AND member_id = ?')
    .get(id, memberId);

  if (existing) {
    userDb
      .prepare('UPDATE member_bookmark_folders SET name = ?, color = ? WHERE id = ? AND member_id = ?')
      .run(name, color, id, memberId);
  } else {
    userDb
      .prepare('INSERT INTO member_bookmark_folders (id, member_id, name, color) VALUES (?, ?, ?, ?)')
      .run(id, memberId, name, color);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/member/bookmark-folders — 북마크 폴더 삭제
export async function DELETE(req: NextRequest) {
  const memberId = await getSessionMemberId();
  if (!memberId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  if (id === 'default') return NextResponse.json({ error: '기본 폴더는 삭제할 수 없습니다.' }, { status: 400 });

  // 폴더 삭제 시 소속 북마크 아이템은 기본 폴더로 이전
  userDb.prepare(
    "UPDATE member_bookmark_items SET folder_id = 'default' WHERE member_id = ? AND folder_id = ?"
  ).run(memberId, id);
  userDb.prepare(
    'DELETE FROM member_bookmark_folders WHERE id = ? AND member_id = ?'
  ).run(id, memberId);

  return NextResponse.json({ success: true });
}
