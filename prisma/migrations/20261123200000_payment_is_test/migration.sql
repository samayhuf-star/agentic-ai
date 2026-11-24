ALTER TABLE "Payment" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- One-time. Later toggles in /sup-admin are left as the admin set them.
UPDATE "Payment" SET "isTest" = true WHERE "id" = 'br6b4764b43b4b9528';
