-- AlterTable
ALTER TABLE "User" ADD COLUMN     "channelFirst" TEXT,
ADD COLUMN     "channelLast" TEXT,
ADD COLUMN     "mktFirst" JSONB,
ADD COLUMN     "mktLast" JSONB;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "capiPurchaseAt" TIMESTAMP(3),
ADD COLUMN     "channelFirst" TEXT,
ADD COLUMN     "channelLast" TEXT,
ADD COLUMN     "gatewayConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "gatewayConfirmedVia" TEXT,
ADD COLUMN     "gclid" TEXT,
ADD COLUMN     "mktFirst" JSONB,
ADD COLUMN     "mktLast" JSONB;

-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN     "lastEmailAt" TIMESTAMP(3),
ADD COLUMN     "lastEmailError" TEXT,
ADD COLUMN     "lastEmailKind" TEXT,
ADD COLUMN     "lastEmailStatus" TEXT,
ADD COLUMN     "rejectReason" TEXT;


-- Backfill: Cashfree payments that reached paid/refunded through the gateway before this marker existed
-- (created by checkout, not by an admin, and carrying the gateway's raw payload).
UPDATE "Payment"
SET "gatewayConfirmedAt" = COALESCE("paidAt", "createdAt"), "gatewayConfirmedVia" = 'backfill'
WHERE "gateway" = 'cashfree' AND "status" IN ('paid', 'refunded') AND "createdBy" IS NULL AND "raw" IS NOT NULL AND "gatewayConfirmedAt" IS NULL;
