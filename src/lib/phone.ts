/** Mesma regra que em web/src/lib/phone.ts (validação checkout). */
const ALLOWED_FORMAT = /^\+?[\d\s().\-]*$/;

export function isValidInternationalPhone(raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length > 50) return false;
  if (!ALLOWED_FORMAT.test(t)) return false;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}
