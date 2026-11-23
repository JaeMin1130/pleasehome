import { Schedule } from '@/types';
import { formatDateWithTime } from './formatters';

export interface TimelineStep {
  id: number;
  label: string;
  fullLabel: string;
  status: 'completed' | 'active' | 'upcoming';
  statusText: string;
  dateDetail: string;
  notes: string | null;
}

export interface TimelineResult {
  steps: TimelineStep[];
  sortedScheds: Schedule[];
}

export function calculateTimelineSteps(schedules?: Schedule[] | null): TimelineResult {
  if (!schedules || schedules.length === 0) {
    return { steps: [], sortedScheds: [] };
  }

  const sortedScheds = [...schedules].sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date) : (a.end_date ? new Date(a.end_date) : null);
    const dateB = b.start_date ? new Date(b.start_date) : (b.end_date ? new Date(b.end_date) : null);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  const now = new Date();

  const getStepStatus = (s: Schedule): { status: 'completed' | 'active' | 'upcoming'; statusText: string } => {
    const start = s.start_date ? new Date(s.start_date) : null;
    const end = s.end_date ? new Date(s.end_date) : null;

    const hasStart = start && !isNaN(start.getTime());
    const hasEnd = end && !isNaN(end.getTime());

    if (hasStart && hasEnd) {
      if (now > end) return { status: 'completed', statusText: '완료' };
      if (now >= start && now <= end) return { status: 'active', statusText: '진행중' };
      return { status: 'upcoming', statusText: '대기' };
    } else if (hasStart) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      
      if (today > startDay) return { status: 'completed', statusText: '완료' };
      if (today.getTime() === startDay.getTime()) return { status: 'active', statusText: '진행중' };
      return { status: 'upcoming', statusText: '대기' };
    } else if (hasEnd) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      if (today > endDay) return { status: 'completed', statusText: '완료' };
      if (today.getTime() === endDay.getTime()) return { status: 'active', statusText: '진행중' };
      return { status: 'upcoming', statusText: '대기' };
    }
    return { status: 'upcoming', statusText: '대기' };
  };

  const steps: TimelineStep[] = sortedScheds.map((s) => {
    const { status, statusText } = getStepStatus(s);

    let dateDetail = '';
    if (s.start_date || s.end_date) {
      dateDetail = `${formatDateWithTime(s.start_date)} ~ ${formatDateWithTime(s.end_date)}`;
    } else {
      dateDetail = s.raw_text || '공고 본문 참고';
    }

    let label = s.schedule_type;
    if (label.length > 10) {
      label = label.substring(0, 10) + '...';
    }

    return {
      id: s.id,
      label,
      fullLabel: s.schedule_type,
      status,
      statusText,
      dateDetail,
      notes: s.notes
    };
  });

  const activeIdx = steps.findIndex(s => s.status === 'active');
  const lastCompletedIdx = steps.map(s => s.status).lastIndexOf('completed');
  if (activeIdx === -1 && lastCompletedIdx !== -1) {
    const nextIdx = lastCompletedIdx + 1;
    if (nextIdx < steps.length) {
      const nextStepData = sortedScheds[nextIdx];
      const start = nextStepData.start_date ? new Date(nextStepData.start_date) : null;
      const end = nextStepData.end_date ? new Date(nextStepData.end_date) : null;
      const hasValidDate = (start && !isNaN(start.getTime())) || (end && !isNaN(end.getTime()));

      if (!hasValidDate) {
        steps[nextIdx].status = 'active';
      }
    }
  }

  return { steps, sortedScheds };
}

export function getTimelineConnectorWidth(idx: number, steps: TimelineStep[]): number {
  const currentActiveIdx = steps.findIndex(s => s.status === 'active');
  const currentLastCompletedIdx = steps.map(s => s.status).lastIndexOf('completed');

  if (currentActiveIdx !== -1) {
    if (idx < currentActiveIdx) return 100;
    return 0;
  } else if (currentLastCompletedIdx !== -1) {
    if (idx < currentLastCompletedIdx) return 100;
    if (idx === currentLastCompletedIdx) {
      return 30;
    }
    return 0;
  }
  return 0;
}
