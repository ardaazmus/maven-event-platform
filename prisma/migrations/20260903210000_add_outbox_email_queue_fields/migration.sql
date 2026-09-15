-- MAIL-07: classify email work so operational messages outrank campaigns.
ALTER TABLE "OutboxEvent" ADD COLUMN "queueClass" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 50;

CREATE INDEX "OutboxEvent_queueClass_priority_idx" ON "OutboxEvent"("queueClass", "priority", "status", "availableAt");
