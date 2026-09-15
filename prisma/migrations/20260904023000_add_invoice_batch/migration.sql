-- INV/F M-03: reproducible batch selection and import row outcomes.
-- Raw files and recipient PII are intentionally not persisted here.
CREATE TABLE "InvoiceBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "selectionFilterJson" TEXT NOT NULL,
    "selectionSnapshotHash" TEXT NOT NULL,
    "formatVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "InvoiceBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "InvoiceBatchRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "paymentOrderIdSnapshot" TEXT NOT NULL,
    "resultStatus" TEXT NOT NULL DEFAULT 'pending',
    "resultCode" TEXT,
    "sourceRowHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceBatchRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InvoiceBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InvoiceBatch_workspaceId_createdAt_idx" ON "InvoiceBatch"("workspaceId", "createdAt");
CREATE INDEX "InvoiceBatch_workspaceId_status_createdAt_idx" ON "InvoiceBatch"("workspaceId", "status", "createdAt");
CREATE UNIQUE INDEX "InvoiceBatchRow_batchId_rowNumber_key" ON "InvoiceBatchRow"("batchId", "rowNumber");
CREATE INDEX "InvoiceBatchRow_batchId_resultStatus_idx" ON "InvoiceBatchRow"("batchId", "resultStatus");
CREATE INDEX "InvoiceBatchRow_paymentOrderIdSnapshot_idx" ON "InvoiceBatchRow"("paymentOrderIdSnapshot");
