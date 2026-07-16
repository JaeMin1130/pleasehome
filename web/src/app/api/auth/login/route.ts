import { NextRequest, NextResponse } from 'next/server';
import { getMemberById, verifyPassword, setSessionCookie } from '@/lib/auth';

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    const { id, password } = await req.json();

    if (!id || !password) {
      return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    const member = getMemberById(id);
    if (!member) {
      return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, member.pwd_hash);
    if (!isValid) {
      return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    await setSessionCookie(member.id);

    return NextResponse.json({ success: true, memberId: member.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
