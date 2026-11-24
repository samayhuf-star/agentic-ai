ALTER TABLE "User" ADD COLUMN "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "amountInr" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "marketingOptOut" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_orderId_key" ON "Lead"("orderId");
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

CREATE TABLE "FollowupSend" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowupSend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FollowupSend_key_key" ON "FollowupSend"("key");

ALTER TABLE "FollowupSend" ADD CONSTRAINT "FollowupSend_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertLog_dedupeKey_channel_key" ON "AlertLog"("dedupeKey", "channel");
CREATE INDEX "AlertLog_createdAt_idx" ON "AlertLog"("createdAt");
