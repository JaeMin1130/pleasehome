import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

// POST /api/auth/logout
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
