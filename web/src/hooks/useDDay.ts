import { useState, useEffect, useMemo } from 'react';
import { Announcement, Schedule } from '@/types';

export interface UseDDayResult {
  dDayText: string | null;
  status: 'UPCOMING' | 'ONGOING' | 'CLOSED';
  minStart: Date | null;
  maxEnd: Date | null;
  applySchedules: Schedule[];
}

export function useDDay(announcement?: Announcement | null): UseDDayResult {
  const [dDayText, setDDayText] = useState<string | null>(null);

  const { minStart, maxEnd, applySchedules } = useMemo(() => {
    if (!announcement || !announcement.schedules) {
      return { minStart: null, maxEnd: null, applySchedules: [] };
    }
    const filtered = announcement.schedules.filter(s => s.schedule_type && s.schedule_type.includes('신청접수'));
    let min: Date | null = null;
    let max: Date | null = null;
    for (const s of filtered) {
      if (s.start_date) {
        const start = new Date(s.start_date);
        if (!isNaN(start.getTime())) {
          if (!min || start < min) min = start;
        }
      }
      if (s.end_date) {
        const end = new Date(s.end_date);
        if (!isNaN(end.getTime())) {
          if (!max || end > max) max = end;
        }
      }
    }
    return { minStart: min, maxEnd: max, applySchedules: filtered };
  }, [announcement]);

  const status: 'UPCOMING' | 'ONGOING' | 'CLOSED' = useMemo(() => {
    if (!announcement || !minStart) return 'CLOSED';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());

    if (today < startDate) return 'UPCOMING';
    if (!maxEnd || now <= maxEnd) return 'ONGOING';
    return 'CLOSED';
  }, [announcement, minStart, maxEnd]);

  useEffect(() => {
    if (!announcement || !minStart) {
      setDDayText(null);
      return;
    }

    const calculateDDay = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let currentStatus: 'CLOSED' | 'UPCOMING' | 'ONGOING' = 'CLOSED';
      if (minStart) {
        const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
        if (today < startDate) {
          currentStatus = 'UPCOMING';
        } else if (!maxEnd || now <= maxEnd) {
          currentStatus = 'ONGOING';
        } else {
          currentStatus = 'CLOSED';
        }
      }

      if (currentStatus === 'UPCOMING' && minStart) {
        const startDate = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate());
        const diffTime = startDate.getTime() - today.getTime();
        if (diffTime > 0) {
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return `접수 D-${diffDays}`;
        }
      } else if (currentStatus === 'ONGOING') {
        if (!maxEnd) {
          return '상시모집';
        }

        const diffTime = maxEnd.getTime() - now.getTime();

        if (diffTime > 0) {
          const hoursLeft = diffTime / (1000 * 60 * 60);
          if (hoursLeft < 24) {
            const hours = Math.floor(diffTime / (1000 * 60 * 60));
            const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

            const hStr = String(hours).padStart(2, '0');
            const mStr = String(minutes).padStart(2, '0');
            const sStr = String(seconds).padStart(2, '0');

            return `마감 ${hStr}:${mStr}:${sStr}`;
          } else {
            const endDate = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), maxEnd.getDate());
            const diffDaysTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffDaysTime / (1000 * 60 * 60 * 24));
            return `마감 D-${diffDays}`;
          }
        } else if (diffTime <= 0) {
          const endDate = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), maxEnd.getDate());
          if (today.getTime() === endDate.getTime()) {
            return '오늘 마감';
          }
        }
      }
      return null;
    };

    setDDayText(calculateDDay());

    const intervalId = setInterval(() => {
      setDDayText(calculateDDay());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [announcement, minStart, maxEnd]);

  return { dDayText, status, minStart, maxEnd, applySchedules };
}
