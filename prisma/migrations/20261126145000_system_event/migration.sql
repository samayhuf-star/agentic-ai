-- Append-only system activity log. Application code does not update or delete rows.
CREATE TABLE "SystemEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "userId" TEXT,
    "paymentId" TEXT,
    "amountInr" INTEGER,
    "status" TEXT,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "tag" TEXT,
    "dedupeKey" TEXT,

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemEvent_dedupeKey_key" ON "SystemEvent"("dedupeKey");
CREATE INDEX "SystemEvent_createdAt_idx" ON "SystemEvent"("createdAt");
CREATE INDEX "SystemEvent_type_createdAt_idx" ON "SystemEvent"("type", "createdAt");
CREATE INDEX "SystemEvent_email_createdAt_idx" ON "SystemEvent"("email", "createdAt");
CREATE INDEX "SystemEvent_source_createdAt_idx" ON "SystemEvent"("source", "createdAt");
CREATE INDEX "SystemEvent_paymentId_createdAt_idx" ON "SystemEvent"("paymentId", "createdAt");
CREATE INDEX "SystemEvent_userId_createdAt_idx" ON "SystemEvent"("userId", "createdAt");
CREATE INDEX "SystemEvent_tag_createdAt_idx" ON "SystemEvent"("tag", "createdAt");
