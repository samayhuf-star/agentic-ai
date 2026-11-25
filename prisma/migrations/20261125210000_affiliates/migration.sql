-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "affiliateId" TEXT,
ADD COLUMN     "refClickId" TEXT,
ADD COLUMN     "refPostId" TEXT;

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "handles" TEXT,
    "code" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "commissionType" TEXT NOT NULL DEFAULT 'percent',
    "rate" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "payoutNotes" TEXT,
    "notes" TEXT,
    "city" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "followers" INTEGER,
    "niche" TEXT,
    "pitch" TEXT,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "appliedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "hiddenBlocks" TEXT NOT NULL DEFAULT '',
    "payoutEnc" TEXT,
    "payoutMasked" TEXT,
    "payoutUpdatedAt" TIMESTAMP(3),
    "payoutUpdatedBy" TEXT,
    "payoutCheckedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "landingPath" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "ipHash" TEXT,
    "uaHash" TEXT,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateCommission" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "paymentId" TEXT,
    "key" TEXT,
    "kind" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "saleAmountInr" INTEGER,
    "rateLabel" TEXT,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "voidReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "payoutRef" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePost" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "postedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "metricsSource" TEXT NOT NULL DEFAULT 'manual',
    "metricsUpdatedAt" TIMESTAMP(3),
    "metricsUpdatedBy" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_code_key" ON "Affiliate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_token_key" ON "Affiliate"("token");

-- CreateIndex
CREATE INDEX "Affiliate_status_idx" ON "Affiliate"("status");

-- CreateIndex
CREATE INDEX "AffiliateClick_affiliateId_createdAt_idx" ON "AffiliateClick"("affiliateId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_postId_idx" ON "AffiliateClick"("postId");

-- CreateIndex
CREATE INDEX "AffiliateClick_affiliateId_ipHash_createdAt_idx" ON "AffiliateClick"("affiliateId", "ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCommission_key_key" ON "AffiliateCommission"("key");

-- CreateIndex
CREATE INDEX "AffiliateCommission_affiliateId_status_idx" ON "AffiliateCommission"("affiliateId", "status");

-- CreateIndex
CREATE INDEX "AffiliateCommission_paymentId_idx" ON "AffiliateCommission"("paymentId");

-- CreateIndex
CREATE INDEX "AffiliatePost_affiliateId_createdAt_idx" ON "AffiliatePost"("affiliateId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_affiliateId_idx" ON "Payment"("affiliateId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePost" ADD CONSTRAINT "AffiliatePost_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

