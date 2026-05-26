import Stripe from 'stripe';

/** Métodos suportados no Stripe Checkout desta app (Portugal). */
export const STRIPE_CHECKOUT_METHOD_OPTIONS = ['card', 'mb_way'] as const;
export type StripeCheckoutMethodOption = (typeof STRIPE_CHECKOUT_METHOD_OPTIONS)[number];

export const lojaStripeSelect = {
  stripeSecretKey: true,
  stripeWebhookSecret: true,
  stripePaymentMethods: true,
} as const;

export type LojaStripeRow = {
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  stripePaymentMethods: string[];
};

const stripeClients = new Map<string, Stripe>();

export function lojaHasStripe(loja: Pick<LojaStripeRow, 'stripeSecretKey'>): boolean {
  return Boolean(loja.stripeSecretKey?.trim());
}

export function getStripeClient(secretKey: string): Stripe {
  const key = secretKey.trim();
  let client = stripeClients.get(key);
  if (!client) {
    client = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    stripeClients.set(key, client);
  }
  return client;
}

export function normalizeStripePaymentMethods(methods: string[]): StripeCheckoutMethodOption[] {
  const allowed = new Set<string>(STRIPE_CHECKOUT_METHOD_OPTIONS);
  const picked = methods.filter((m): m is StripeCheckoutMethodOption =>
    allowed.has(m as StripeCheckoutMethodOption)
  );
  return picked.length > 0 ? picked : ['card'];
}

export function lojaStripePaymentMethodTypes(
  loja: Pick<LojaStripeRow, 'stripePaymentMethods'>
): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  return normalizeStripePaymentMethods(
    loja.stripePaymentMethods
  ) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
}
