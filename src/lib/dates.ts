const MS_PER_DAY = 86_400_000;

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtc(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

export interface Anniversary {
  /** ISO date of the next occurrence. */
  date: string;
  /** Completed years of service at that occurrence. */
  years: number;
  /** Whole days from today (0 = today). */
  daysAway: number;
}

/**
 * Next occurrence of a start-date anniversary on or after today.
 * Leap-day starts roll over to 1 March in non-leap years (Date.UTC behaviour).
 */
export function nextAnniversary(startDate: string, today: Date = todayUtc()): Anniversary {
  const start = parseIsoDate(startDate);
  const base = todayUtc(today);

  let year = base.getUTCFullYear();
  let occurrence = new Date(
    Date.UTC(year, start.getUTCMonth(), start.getUTCDate()),
  );

  if (occurrence.getTime() < base.getTime()) {
    year += 1;
    occurrence = new Date(Date.UTC(year, start.getUTCMonth(), start.getUTCDate()));
  }

  return {
    date: toIsoDate(occurrence),
    years: Math.max(0, year - start.getUTCFullYear()),
    daysAway: Math.round((occurrence.getTime() - base.getTime()) / MS_PER_DAY),
  };
}

/** Whole days from an ISO date until today: positive in the past, negative in the future. */
export function daysSince(value: string, today: Date = todayUtc()): number {
  const base = todayUtc(today);
  return Math.round((base.getTime() - parseIsoDate(value).getTime()) / MS_PER_DAY);
}
