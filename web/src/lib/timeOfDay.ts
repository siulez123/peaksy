const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HH_ROUND = /^([01]\d|2[0-3]):00$/;
const HH_HALF = /^([01]\d|2[0-3]):(00|30)$/;

export function isValidHhMm(s: string): boolean {
  return HH_MM.test(s.trim());
}

/** Hora em ponto (minutos 00), ex.: 08:00, 14:00 */
export function isValidHhRoundHour(s: string): boolean {
  return HH_ROUND.test(s.trim());
}

export function isValidHhHalfHour(s: string): boolean {
  return HH_HALF.test(s.trim());
}

/** Normaliza para HH:00 ou HH:30 (a partir de `<input type="time" step="1800">`). */
export function normalizeTimeToHalfHourSlot(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const m = t.match(HH_MM);
  if (!m) return '';
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (min !== 0 && min !== 30) return '';
  return `${String(h).padStart(2, '0')}:${min === 0 ? '00' : '30'}`;
}

/** @deprecated Prefer normalizeTimeToHalfHourSlot */
export function normalizeTimeToHourSlot(raw: string): string {
  return normalizeTimeToHalfHourSlot(raw);
}

export function parseTimeToMinutes(t: string): number | null {
  const m = t.trim().match(HH_MM);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function isTimeWithinWindow(time: string, min: string, max: string): boolean {
  const p = parseTimeToMinutes(time);
  const a = parseTimeToMinutes(min);
  const b = parseTimeToMinutes(max);
  if (p === null || a === null || b === null) return false;
  if (a <= b) return p >= a && p <= b;
  return p >= a || p <= b;
}

/** Slots HH:00 ou HH:30 entre min e max (inclusive), de 30 em 30 minutos. */
export function pickupHalfHourSlotsBetween(minHhMm: string, maxHhMm: string): string[] {
  const a = parseTimeToMinutes(minHhMm);
  const b = parseTimeToMinutes(maxHhMm);
  if (a === null || b === null || a > b) return [];
  const slots: string[] = [];
  for (let m = a; m <= b; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${mm === 0 ? '00' : '30'}`);
  }
  return slots;
}

/** Apresentação legível, ex. `13h`, `13h30`. */
export function formatPickupHourLabelPt(hhMm: string): string {
  const t = hhMm.trim();
  const mins = t.slice(3, 5);
  const h = parseInt(t.slice(0, 2), 10);
  if (!Number.isFinite(h)) return t;
  if (mins === '30') return `${h}h30`;
  return `${h}h`;
}
