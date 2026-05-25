import { sanitizeClientErrorMessage } from './safeErrorMessage';

/** Mensagens de login — não revelar se a conta é de outra loja. */
export function loginErrorMessage(
  err: unknown,
  t: (key: string) => string
): string {
  const raw = err instanceof Error ? err.message : '';
  if (/invalid credentials/i.test(raw)) {
    return t('common.invalidCredentials');
  }
  if (raw) return sanitizeClientErrorMessage(raw);
  return t('common.loginFailed');
}
