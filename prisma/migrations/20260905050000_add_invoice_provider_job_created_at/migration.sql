ALTER TABLE "InvoiceRecord" ADD COLUMN "providerJobCreatedAt" DATETIME;

CREATE INDEX "InvoiceRecord_workspaceId_state_providerJobCreatedAt_idx" ON "InvoiceRecord"("workspaceId", "state", "providerJobCreatedAt");
