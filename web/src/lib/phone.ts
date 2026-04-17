/**
 * Validação básica para telefone nacional ou internacional.
 * Conta apenas dígitos (8–15, alinhado a E.164); aceita + no início e espaços, traços, pontos e parênteses.
 */
const ALLOWED_FORMAT = /^\+?[\d\s().\-]*$/;

export function isValidInternationalPhone(raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length > 50) return false;
  if (!ALLOWED_FORMAT.test(t)) return false;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export const phoneFieldHint =
  'Podes usar o indicativo do país (ex.: +351 ou 0033). Entre 8 e 15 dígitos no total.';
