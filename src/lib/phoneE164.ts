import { isValidInternationalPhone } from './phone';

/** Normaliza para E.164 (Twilio). PT: 9 dígitos começados por 9 → +351… */
export function normalizePhoneE164(raw: string): string | null {
  if (!isValidInternationalPhone(raw)) return null;

  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
    return `+${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('351')) {
    return `+${digits}`;
  }

  if (digits.length === 9 && /^9[1236]\d{7}$/.test(digits)) {
    return `+351${digits}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
