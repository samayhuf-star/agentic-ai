-- Additive only. Existing rows keep nulls. The old "sells" column stays.
ALTER TABLE "User" ADD COLUMN "category" TEXT;
ALTER TABLE "User" ADD COLUMN "businessType" TEXT;
ALTER TABLE "User" ADD COLUMN "customType" TEXT;
