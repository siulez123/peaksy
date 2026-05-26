import crypto from 'node:crypto';

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_MIN_MS = 120 * 1000;

function otpPepper(): string {
  const p = process.env.OTP_PEPPER?.trim();
  if (p) return p;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OTP_PEPPER é obrigatório em produção.');
  }
  return 'dev-otp-pepper-change-me';
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
}

export function hashOtpCode(code: string): string {
  return crypto.createHmac('sha256', otpPepper()).update(code.trim()).digest('hex');
}

export function verifyOtpCode(code: string, hash: string): boolean {
  const normalized = code.replace(/\D/g, '');
  if (normalized.length !== OTP_LENGTH) return false;
  const expected = hashOtpCode(normalized);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}
