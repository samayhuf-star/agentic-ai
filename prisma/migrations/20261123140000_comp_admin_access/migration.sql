-- Owner emails in ADMIN_EMAILS get an account without a payment row.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "compAccess" BOOLEAN NOT NULL DEFAULT false;
