import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const announcementId = searchParams.get('announcement_id');
    
    let complexes;
    if (announcementId) {
      complexes = db.prepare('SELECT * FROM complexes WHERE announcement_id = ?').all(announcementId);
    } else {
      complexes = db.prepare('SELECT * FROM complexes').all();
    }
    
    return NextResponse.json(complexes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
