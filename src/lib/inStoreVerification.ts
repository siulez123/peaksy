/** Como confirmar encomendas «pagar na loja» (máx. um método ou nenhum). */
export type InStoreVerificationMode = 'none' | 'sms' | 'email';

export function resolveInStoreVerification(loja: {
  allowInStorePayment: boolean;
  inStoreVerifySms: boolean;
  inStoreVerifyEmail: boolean;
}): InStoreVerificationMode {
  if (!loja.allowInStorePayment) return 'none';
  if (loja.inStoreVerifySms) return 'sms';
  if (loja.inStoreVerifyEmail) return 'email';
  return 'none';
}
