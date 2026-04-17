/** Alinhado a src/lib/safeClientMessage.ts (camada extra no browser). */
export const GENERIC_CLIENT_ERROR = 'Ocorreu um erro. Tenta novamente.';

export function sanitizeClientErrorMessage(message: string): string {
  const m = message.trim();
  if (!m) return GENERIC_CLIENT_ERROR;

  if (/sk_(test|live)_/i.test(m)) return GENERIC_CLIENT_ERROR;
  if (/pk_(test|live)_/i.test(m)) return GENERIC_CLIENT_ERROR;
  if (/invalid\s+api\s+key/i.test(m)) return GENERIC_CLIENT_ERROR;
  if (/api[_\s-]*key/i.test(m) && /(invalid|provided|expired)/i.test(m)) return GENERIC_CLIENT_ERROR;

  return m;
}
