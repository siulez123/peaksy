-- Configuração de email (SMTP) e SMS (Twilio) por loja
ALTER TABLE "lojas" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "lojas" ADD COLUMN "smtpPort" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "lojas" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lojas" ADD COLUMN "smtpUser" TEXT;
ALTER TABLE "lojas" ADD COLUMN "smtpPassword" TEXT;
ALTER TABLE "lojas" ADD COLUMN "emailFrom" TEXT;
ALTER TABLE "lojas" ADD COLUMN "twilioAccountSid" TEXT;
ALTER TABLE "lojas" ADD COLUMN "twilioAuthToken" TEXT;
ALTER TABLE "lojas" ADD COLUMN "twilioFromNumber" TEXT;
