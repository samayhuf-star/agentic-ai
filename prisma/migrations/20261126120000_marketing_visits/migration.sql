-- CreateTable
CREATE TABLE "MarketingVisit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "channel" TEXT,
    "campaign" TEXT,
    "mkt" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingVisit_createdAt_idx" ON "MarketingVisit"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingVisit_visitorId_createdAt_idx" ON "MarketingVisit"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketingVisit_source_createdAt_idx" ON "MarketingVisit"("source", "createdAt");
