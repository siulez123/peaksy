-- CreateTable
CREATE TABLE "checkout_verifications" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checkout_verifications_lojaId_phoneE164_createdAt_idx" ON "checkout_verifications"("lojaId", "phoneE164", "createdAt");

-- AddForeignKey
ALTER TABLE "checkout_verifications" ADD CONSTRAINT "checkout_verifications_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
