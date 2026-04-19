/** HH:mm (24h), minutos com zero à esquerda */
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Hora em ponto (minutos 00), ex.: 08:00, 14:00 */
const HH_ROUND = /^([01]\d|2[0-3]):00$/;

/** Hora em ponto ou meia (minutos 00 ou 30), ex.: 07:30, 08:00, 19:30 */
const HH_HALF = /^([01]\d|2[0-3]):(00|30)$/;

export function isValidHhMm(s: string): boolean {
  return HH_MM.test(s.trim());
}

export function isValidHhRoundHour(s: string): boolean {
  return HH_ROUND.test(s.trim());
}

export function isValidHhHalfHour(s: string): boolean {
  return HH_HALF.test(s.trim());
}

/** Normaliza para HH:00 (vazio se inválido). */
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

/** Verifica se `time` está no intervalo [min, max] inclusive (mesmo dia). */
export function isTimeWithinWindow(time: string, min: string, max: string): boolean {
  const p = parseTimeToMinutes(time);
  const a = parseTimeToMinutes(min);
  const b = parseTimeToMinutes(max);
  if (p === null || a === null || b === null) return false;
  if (a <= b) return p >= a && p <= b;
  // janela atravessa meia-noite (raro)
  return p >= a || p <= b;
}
