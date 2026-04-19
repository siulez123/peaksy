import { DateTime } from 'luxon';

export function getTodayInTimezone(timezone: string = 'Europe/Lisbon'): Date {
  const now = DateTime.now().setZone(timezone);
  return now.startOf('day').toJSDate();
}

export function isDateAfterToday(
  date: Date | string,
  timezone: string = 'Europe/Lisbon'
): boolean {
  const today = getTodayInTimezone(timezone);
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const checkDateStart = DateTime.fromJSDate(checkDate)
    .setZone(timezone)
    .startOf('day')
    .toJSDate();
  return checkDateStart > today;
}

export function isDateTodayOrAfter(
  date: Date | string,
  timezone: string = 'Europe/Lisbon'
): boolean {
  const today = getTodayInTimezone(timezone);
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const checkDateStart = DateTime.fromJSDate(checkDate)
    .setZone(timezone)
    .startOf('day')
    .toJSDate();
  return checkDateStart >= today;
}

export function formatDateForDB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function parseDateFromDB(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

/** Data de levantamento `YYYY-MM-DD` estritamente posterior ao dia civil atual no fuso da padaria. */
export function isFuturePickupCalendarDate(dateStr: string, timezone: string): boolean {
  const pickup = DateTime.fromISO(dateStr, { zone: timezone }).startOf('day');
  if (!pickup.isValid) return false;
  const today = DateTime.now().setZone(timezone).startOf('day');
  return pickup > today;
}

/**
 * Limite de encomenda tem de ser **antes** do início do dia civil de levantamento
 * (ex.: levantamento a 24/12 → encomendas até 23/12 17h).
 */
export function isOrderDeadlineBeforePickupCalendarDay(
  orderDeadline: Date,
  pickupDateStr: string,
  timezone: string
): boolean {
  const pickupStart = DateTime.fromISO(pickupDateStr, { zone: timezone }).startOf('day');
  const deadline = DateTime.fromJSDate(orderDeadline).setZone(timezone);
  if (!pickupStart.isValid || !deadline.isValid) return false;
  return deadline < pickupStart;
}

/** Intervalos [aStart,aEnd] e [bStart,bEnd] em YYYY-MM-DD sobrepostos. */
export function ymdRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Lista cada dia civil entre início e fim (inclusive), no fuso indicado. */
export function eachCalendarDateInRangeInclusive(
  startStr: string,
  endStr: string,
  timezone: string
): string[] {
  const start = DateTime.fromISO(startStr, { zone: timezone }).startOf('day');
  const end = DateTime.fromISO(endStr, { zone: timezone }).startOf('day');
  if (!start.isValid || !end.isValid || end < start) return [];
  const out: string[] = [];
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    out.push(d.toFormat('yyyy-MM-dd'));
  }
  return out;
}

