import { addMinutes, startOfDay } from 'date-fns';

export function normalizeTimeString(raw: string): string | null {
  const t = raw.trim().replace(',', '.');
  const m = /^(\d{1,2})[.:](\d{1,2})$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return null;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

/** Календарный день + время → полная дата */
export function combineCalendarAndTime(day: Date, hhmm: string): Date | null {
  const n = normalizeTimeString(hhmm);
  if (!n) return null;
  const [h, min] = n.split(':').map(Number);
  const d = startOfDay(day);
  d.setHours(h, min, 0, 0);
  return d;
}

/** Следующий 30-мин слот после «сейчас», длительность по умолчанию 15 мин */
export function getDefaultScheduleSeed(): {
  startDate: Date;
  startTime: string;
  duration: string;
} {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  let slotStart = Math.ceil((mins + 1) / 30) * 30;
  let baseDay = startOfDay(now);

  if (slotStart >= 24 * 60) {
    slotStart = 0;
    baseDay = addMinutes(baseDay, 24 * 60);
  }

  const sh = Math.floor(slotStart / 60);
  const sm = slotStart % 60;
  const pad = (x: number) => String(x).padStart(2, '0');

  const startDt = new Date(baseDay);
  startDt.setHours(sh, sm, 0, 0);

  return {
    startDate: startOfDay(startDt),
    startTime: `${pad(sh)}:${pad(sm)}`,
    duration: '15',
  };
}
