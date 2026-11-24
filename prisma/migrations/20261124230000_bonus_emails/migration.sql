-- Additive: bonus email log, monthly prompt updates, and send receipts.

CREATE TABLE "BonusEmailLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bonusKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BonusEmailLog_orderId_bonusKey_key" ON "BonusEmailLog"("orderId", "bonusKey");
CREATE INDEX "BonusEmailLog_status_scheduledFor_idx" ON "BonusEmailLog"("status", "scheduledFor");

ALTER TABLE "BonusEmailLog" ADD CONSTRAINT "BonusEmailLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PromptUpdate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptUpdate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromptUpdate_slug_key" ON "PromptUpdate"("slug");

CREATE TABLE "PromptUpdateSend" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptUpdateSend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromptUpdateSend_updateId_email_key" ON "PromptUpdateSend"("updateId", "email");
CREATE INDEX "PromptUpdateSend_updateId_status_idx" ON "PromptUpdateSend"("updateId", "status");

ALTER TABLE "PromptUpdateSend" ADD CONSTRAINT "PromptUpdateSend_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "PromptUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
