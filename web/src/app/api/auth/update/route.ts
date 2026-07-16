import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionMemberId, hashPassword, verifyPassword } from '@/lib/auth';

// PATCH /api/auth/update — 회원정보 수정 (비밀번호, 보안 질문/답변)
export async function PATCH(req: NextRequest) {
  try {
    const memberId = await getSessionMemberId();
    if (!memberId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await req.json();
    const { current_password, new_password, security_q, security_a } = body;

    // DB에서 현재 회원 정보 조회
    const member = db
      .prepare('SELECT * FROM members WHERE id = ?')
      .get(memberId) as { id: string; pwd_hash: string; security_q: string; security_a: string } | undefined;

    if (!member) {
      return NextResponse.json({ error: '회원 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 비밀번호 변경 요청인 경우
    if (new_password !== undefined) {
      if (!current_password) {
        return NextResponse.json({ error: '현재 비밀번호를 입력해주세요.' }, { status: 400 });
      }
      const isValid = await verifyPassword(current_password, member.pwd_hash);
      if (!isValid) {
        return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 });
      }
      if (!new_password || new_password.length < 6) {
        return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
      }
      const new_hash = await hashPassword(new_password);
      db.prepare('UPDATE members SET pwd_hash = ? WHERE id = ?').run(new_hash, memberId);
    }

    // 보안 질문/답변 수정 요청인 경우
    if (security_q !== undefined || security_a !== undefined) {
      const newQ = security_q ?? member.security_q;
      const newA = security_a ?? member.security_a;
      if (!newA.trim()) {
        return NextResponse.json({ error: '보안 답변을 입력해주세요.' }, { status: 400 });
      }
      db.prepare('UPDATE members SET security_q = ?, security_a = ? WHERE id = ?').run(newQ, newA.trim(), memberId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
