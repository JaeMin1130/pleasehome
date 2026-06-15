import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all() as any[];
    
    const result = announcements.map((ann) => {
      const schedules = db.prepare('SELECT * FROM announcement_schedules WHERE announcement_id = ?').all(ann.id);
      const details = db.prepare('SELECT * FROM announcement_details WHERE announcement_id = ? ORDER BY sort_order ASC, id ASC').all(ann.id);
      const limits = db.prepare('SELECT * FROM announcement_limits WHERE announcement_id = ?').all(ann.id);
      
      return {
        ...ann,
        schedules,
        details,
        limits,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
