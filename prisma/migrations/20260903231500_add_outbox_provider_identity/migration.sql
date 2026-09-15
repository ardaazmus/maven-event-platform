-- MAIL-12D: retain provider identity for send/webhook correlation.
ALTER TABLE "OutboxEvent" ADD COLUMN "provider" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN "providerMessageId" TEXT;

CREATE INDEX "OutboxEvent_workspaceId_provider_providerMessageId_idx" ON "OutboxEvent"("workspaceId", "provider", "providerMessageId");
