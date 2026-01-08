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

