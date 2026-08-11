import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const groupByAnnId = (rows: any[]) =>
  rows.reduce((map, item) => {
    (map[item.announcement_id] = map[item.announcement_id] || []).push(item);
    return map;
  }, {} as Record<number, any[]>);

export async function GET() {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all() as any[];
    if (announcements.length === 0) return NextResponse.json([]);

    const schedulesMap = groupByAnnId(db.prepare('SELECT * FROM announcement_schedules').all());
    const detailsMap = groupByAnnId(db.prepare('SELECT * FROM announcement_details ORDER BY sort_order ASC, id ASC').all());
    const limitsMap = groupByAnnId(db.prepare('SELECT * FROM announcement_limits').all());

    const result = announcements.map((ann) => ({
      ...ann,
      schedules: schedulesMap[ann.id] || [],
      details: detailsMap[ann.id] || [],
      limits: limitsMap[ann.id] || [],
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
