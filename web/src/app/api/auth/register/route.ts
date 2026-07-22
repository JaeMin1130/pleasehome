import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const { id, password, security_q, security_a } = await req.json();

    if (!id || !password || !security_q || !security_a) {
      return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 });
    }
    // if (id.length < 3 || id.length > 20 || password.length < 3) {
    //   return NextResponse.json({ error: '아이디는 4~20자로 입력해주세요.' }, { status: 400 });
    // }
    // if (password.length < 6) {
    //   return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
    // }

    // 중복 아이디 확인
    const existing = userDb.prepare('SELECT id FROM members WHERE id = ?').get(id);
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
    }

    const pwd_hash = await hashPassword(password);

    userDb.prepare(
      'INSERT INTO members (id, pwd_hash, security_q, security_a) VALUES (?, ?, ?, ?)'
    ).run(id, pwd_hash, security_q, security_a);


    // 세션 쿠키 발급 (가입 후 자동 로그인)
    await setSessionCookie(id);

    return NextResponse.json({ success: true, memberId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
