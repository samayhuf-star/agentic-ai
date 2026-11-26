-- CreateTable
CREATE TABLE "AgentLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "need" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "timeZone" TEXT,
    "country" TEXT,
    "referrer" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentLead_createdAt_idx" ON "AgentLead"("createdAt");

-- CreateIndex
CREATE INDEX "AgentLead_email_idx" ON "AgentLead"("email");

-- CreateIndex
CREATE INDEX "AgentLead_status_idx" ON "AgentLead"("status");

-- CreateIndex
CREATE INDEX "AgentLead_isTest_idx" ON "AgentLead"("isTest");
