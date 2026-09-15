ALTER TABLE "InvoiceRecord" ADD COLUMN "providerJobId" TEXT;

CREATE INDEX "InvoiceRecord_workspaceId_providerJobId_idx" ON "InvoiceRecord"("workspaceId", "providerJobId");
