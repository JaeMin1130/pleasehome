import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { getMemberById, hashPassword } from '@/lib/auth';

// POST /api/auth/find-account
// 비밀번호 찾기: 아이디 + 보안질문 답변 검증 후 새 비밀번호로 변경
export async function POST(req: NextRequest) {
  try {
    const { id, security_a, new_password } = await req.json();

    if (!id || !security_a) {
      return NextResponse.json({ error: '아이디와 보안 답변을 입력해주세요.' }, { status: 400 });
    }

    const member = getMemberById(id);
    if (!member) {
      return NextResponse.json({ error: '존재하지 않는 아이디입니다.' }, { status: 404 });
    }

    if (member.security_a !== security_a) {
      return NextResponse.json({ error: '보안 답변이 올바르지 않습니다.' }, { status: 401 });
    }

    // 답변만 검증하는 1단계 요청 (new_password 없음)
    if (!new_password) {
      return NextResponse.json({ verified: true, security_q: member.security_q });
    }

    // 2단계: 새 비밀번호 설정
    if (new_password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const pwd_hash = await hashPassword(new_password);
    userDb.prepare('UPDATE members SET pwd_hash = ? WHERE id = ?').run(pwd_hash, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/auth/find-account?id=xxx — 해당 아이디의 보안 질문 반환
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const member = getMemberById(id);
  if (!member) {
    return NextResponse.json({ error: '존재하지 않는 아이디입니다.' }, { status: 404 });
  }

  return NextResponse.json({ security_q: member.security_q });
}
