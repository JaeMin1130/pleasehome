import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const complexId = searchParams.get('complex_id');
    const announcementId = searchParams.get('announcement_id');
    
    let units;
    if (complexId) {
      units = db.prepare('SELECT * FROM housing_units WHERE complex_id = ?').all(complexId);
    } else if (announcementId) {
      units = db.prepare('SELECT * FROM housing_units WHERE announcement_id = ?').all(announcementId);
    } else {
      units = db.prepare('SELECT * FROM housing_units').all();
    }
    
    return NextResponse.json(units);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
