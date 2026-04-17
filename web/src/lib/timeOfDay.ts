const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HH_ROUND = /^([01]\d|2[0-3]):00$/;

export function isValidHhMm(s: string): boolean {
  return HH_MM.test(s.trim());
}

/** Hora em ponto (minutos 00), ex.: 08:00, 14:00 */
export function isValidHhRoundHour(s: string): boolean {
  return HH_ROUND.test(s.trim());
}

/** Normaliza o valor de um `<input type="time">` para HH:00 (vazio se inválido). */
export function normalizeTimeToHourSlot(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const h = parseInt(t.split(':')[0] ?? '', 10);
  if (Number.isNaN(h) || h < 0 || h > 23) return '';
  return `${String(h).padStart(2, '0')}:00`;
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

/** Valores `HH:00` entre min e max (inclusive), de hora em hora. */
export function pickupHourSlotsBetween(minHhMm: string, maxHhMm: string): string[] {
  const a = parseTimeToMinutes(minHhMm);
  const b = parseTimeToMinutes(maxHhMm);
  if (a === null || b === null || a > b) return [];
  const slots: string[] = [];
  for (let m = a; m <= b; m += 60) {
    const h = Math.floor(m / 60);
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

/** Apresentação só com a hora, ex. `13h` (valor interno continua `HH:00`). */
export function formatPickupHourLabelPt(hhMm: string): string {
  const h = parseInt(hhMm.trim().slice(0, 2), 10);
  return Number.isFinite(h) ? `${h}h` : hhMm.trim();
}
