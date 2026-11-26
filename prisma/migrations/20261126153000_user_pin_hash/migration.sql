-- Optional hashed sign-in PIN on a user account. Application code stores only the hash.
ALTER TABLE "User" ADD COLUMN "pinHash" TEXT;
