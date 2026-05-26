-- Opções de validação de encomenda «pagar na loja»
ALTER TABLE "lojas" ADD COLUMN "inStoreVerifySms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lojas" ADD COLUMN "inStoreVerifyEmail" BOOLEAN NOT NULL DEFAULT false;

-- Verificação por SMS ou email
CREATE TYPE "CheckoutVerificationChannel" AS ENUM ('SMS', 'EMAIL');

ALTER TABLE "checkout_verifications" ADD COLUMN "channel" "CheckoutVerificationChannel" NOT NULL DEFAULT 'SMS';
ALTER TABLE "checkout_verifications" ADD COLUMN "email" TEXT;
ALTER TABLE "checkout_verifications" ALTER COLUMN "phoneE164" DROP NOT NULL;

CREATE INDEX "checkout_verifications_lojaId_email_createdAt_idx" ON "checkout_verifications"("lojaId", "email", "createdAt");
