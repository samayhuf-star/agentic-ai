-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Payment" ADD COLUMN "amountUsdCents" INTEGER;
