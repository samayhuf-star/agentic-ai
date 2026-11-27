-- Range scans for live analytics: tag (null = customers), type, then time.
CREATE INDEX "SystemEvent_tag_type_createdAt_idx" ON "SystemEvent"("tag", "type", "createdAt");
