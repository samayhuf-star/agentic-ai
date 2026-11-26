-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN "resendId" TEXT;

-- CreateIndex
CREATE INDEX "EmailLog_resendId_idx" ON "EmailLog"("resendId");

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resendId" TEXT,
    "leadId" TEXT,
    "paymentId" TEXT,
    "subject" TEXT,
    "detail" TEXT,
    "userAgent" TEXT,
    "url" TEXT,
    "dedupeKey" TEXT,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_dedupeKey_key" ON "EmailEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailEvent_email_createdAt_idx" ON "EmailEvent"("email", "createdAt");

-- CreateIndex
CREATE INDEX "EmailEvent_leadId_idx" ON "EmailEvent"("leadId");

-- CreateIndex
CREATE INDEX "EmailEvent_paymentId_idx" ON "EmailEvent"("paymentId");

-- CreateIndex
CREATE INDEX "EmailEvent_resendId_idx" ON "EmailEvent"("resendId");
