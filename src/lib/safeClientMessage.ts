/** Mensagem segura quando o erro original não pode ser mostrada ao cliente (ex.: chaves Stripe). */
export const GENERIC_CLIENT_ERROR = 'Ocorreu um erro. Tenta novamente.';

/**
 * Evita expor segredos ou mensagens técnicas do Stripe/SDK em respostas HTTP.
 */
export function sanitizeClientErrorMessage(message: string): string {
  const m = message.trim();
  if (!m) return GENERIC_CLIENT_ERROR;

  if (/sk_(test|live)_/i.test(m)) return GENERIC_CLIENT_ERROR;
  if (/pk_(test|live)_/i.test(m)) return GENERIC_CLIENT_ERROR;
  if (/invalid\s+api\s+key/i.test(m)) return GENERIC_CLIENT_ERROR;
  if (/api[_\s-]*key/i.test(m) && /(invalid|provided|expired)/i.test(m)) return GENERIC_CLIENT_ERROR;

  return m;
}
