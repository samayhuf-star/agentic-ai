-- Server-side Google Ads purchase upload, once per paid order.
ALTER TABLE "Payment" ADD COLUMN "googleAdsUploadedAt" TIMESTAMP(3);
