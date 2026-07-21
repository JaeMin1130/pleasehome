import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all() as any[];
    if (announcements.length === 0) {
      return NextResponse.json([]);
    }

    const schedulesAll = db.prepare('SELECT * FROM announcement_schedules').all() as any[];
    const detailsAll = db.prepare('SELECT * FROM announcement_details ORDER BY sort_order ASC, id ASC').all() as any[];
    const limitsAll = db.prepare('SELECT * FROM announcement_limits').all() as any[];

    const schedulesMap = new Map<number, any[]>();
    for (const s of schedulesAll) {
      const list = schedulesMap.get(s.announcement_id) || [];
      list.push(s);
      schedulesMap.set(s.announcement_id, list);
    }

    const detailsMap = new Map<number, any[]>();
    for (const d of detailsAll) {
      const list = detailsMap.get(d.announcement_id) || [];
      list.push(d);
      detailsMap.set(d.announcement_id, list);
    }

    const limitsMap = new Map<number, any[]>();
    for (const l of limitsAll) {
      const list = limitsMap.get(l.announcement_id) || [];
      list.push(l);
      limitsMap.set(l.announcement_id, list);
    }

    const result = announcements.map((ann) => ({
      ...ann,
      schedules: schedulesMap.get(ann.id) || [],
      details: detailsMap.get(ann.id) || [],
      limits: limitsMap.get(ann.id) || [],
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
