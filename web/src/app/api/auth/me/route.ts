import { NextResponse } from 'next/server';
import { getSessionMemberId, getMemberById } from '@/lib/auth';

// GET /api/auth/me — 현재 로그인 회원 정보 반환
export async function GET() {
  const memberId = await getSessionMemberId();
  if (!memberId) {
    return NextResponse.json({ member: null });
  }

  const member = getMemberById(memberId);
  if (!member) {
    return NextResponse.json({ member: null });
  }

  return NextResponse.json({
    member: {
      id: member.id,
      security_q: member.security_q,
      created_at: member.created_at,
    },
  });
}
