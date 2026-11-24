ALTER TABLE "Payment" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "refundedBy" TEXT;

CREATE INDEX "Payment_status_isTest_paidAt_idx" ON "Payment"("status", "isTest", "paidAt");
CREATE INDEX "Payment_status_isTest_createdAt_idx" ON "Payment"("status", "isTest", "createdAt");
CREATE INDEX "Payment_isTest_createdAt_idx" ON "Payment"("isTest", "createdAt");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_onboardedAt_idx" ON "User"("onboardedAt");
CREATE INDEX "Session_userId_createdAt_idx" ON "Session"("userId", "createdAt");
CREATE INDEX "Message_userId_role_createdAt_idx" ON "Message"("userId", "role", "createdAt");
CREATE INDEX "UserAiKey_provider_createdAt_idx" ON "UserAiKey"("provider", "createdAt");
CREATE INDEX "EmailLog_toEmail_createdAt_idx" ON "EmailLog"("toEmail", "createdAt");
