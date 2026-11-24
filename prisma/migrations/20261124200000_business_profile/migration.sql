-- Additive only. Existing rows keep their current values, including "sells".
ALTER TABLE "User" ADD COLUMN "category" TEXT;
ALTER TABLE "User" ADD COLUMN "businessType" TEXT;
ALTER TABLE "User" ADD COLUMN "businessCustom" TEXT;
