import type { WorkingHour } from '@prisma/client';

/** Current weekday (0=Sun..6=Sat) and minutes-since-midnight in Africa/Cairo. */
export function nowInCairo(now: Date = new Date()): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = days[get('weekday')] ?? 0;
  const hour = Number(get('hour')) % 24; // "24:00" → 0
  const minute = Number(get('minute'));
  return { dayOfWeek, minutes: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * True if any of today's shifts covers the current Cairo time.
 * Overnight shifts (opensAt > closesAt, e.g. 20:00–02:00) are supported.
 */
export function isOpenNow(workingHours: WorkingHour[], now: Date = new Date()): boolean {
  const { dayOfWeek, minutes } = nowInCairo(now);
  return workingHours
    .filter((wh) => wh.dayOfWeek === dayOfWeek)
    .some((wh) => {
      const open = toMinutes(wh.opensAt);
      const close = toMinutes(wh.closesAt);
      if (close >= open) return minutes >= open && minutes <= close;
      return minutes >= open || minutes <= close; // wraps past midnight
    });
}
