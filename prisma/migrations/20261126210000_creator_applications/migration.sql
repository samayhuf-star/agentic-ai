-- CreateTable
CREATE TABLE "CreatorApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileUrls" TEXT NOT NULL,
    "followerRange" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "contentTypes" TEXT NOT NULL,
    "languages" TEXT NOT NULL,
    "rateType" TEXT,
    "rateNote" TEXT,
    "sampleLinks" TEXT,
    "note" TEXT,
    "selectedApps" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorApplication_createdAt_idx" ON "CreatorApplication"("createdAt");

-- CreateIndex
CREATE INDEX "CreatorApplication_email_idx" ON "CreatorApplication"("email");

-- CreateIndex
CREATE INDEX "CreatorApplication_status_idx" ON "CreatorApplication"("status");

-- CreateIndex
CREATE INDEX "CreatorApplication_isTest_idx" ON "CreatorApplication"("isTest");
