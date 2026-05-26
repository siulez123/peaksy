-- Stripe por loja (chaves, webhook e métodos de pagamento no Checkout)
ALTER TABLE "lojas" ADD COLUMN "stripeSecretKey" TEXT;
ALTER TABLE "lojas" ADD COLUMN "stripeWebhookSecret" TEXT;
ALTER TABLE "lojas" ADD COLUMN "stripePaymentMethods" TEXT[] NOT NULL DEFAULT ARRAY['card', 'mb_way']::TEXT[];
