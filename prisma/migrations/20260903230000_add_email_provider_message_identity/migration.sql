-- MAIL-12C: retain provider message identity without retaining raw webhook payloads.
ALTER TABLE "EmailProviderEvent" ADD COLUMN "providerMessageId" TEXT;

CREATE INDEX "EmailProviderEvent_workspaceId_provider_providerMessageId_idx" ON "EmailProviderEvent"("workspaceId", "provider", "providerMessageId");
