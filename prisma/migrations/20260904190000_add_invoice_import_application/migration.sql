-- INV/F I-05: durable per-row apply journal prevents replay side effects.
CREATE TABLE "InvoiceImportApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "approvedById" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceImportApplication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceImportApplication_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "InvoiceImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceImportApplication_workspaceId_idempotencyKey_key" ON "InvoiceImportApplication"("workspaceId", "idempotencyKey");
CREATE UNIQUE INDEX "InvoiceImportApplication_importBatchId_rowNumber_key" ON "InvoiceImportApplication"("importBatchId", "rowNumber");
CREATE INDEX "InvoiceImportApplication_workspaceId_status_createdAt_idx" ON "InvoiceImportApplication"("workspaceId", "status", "createdAt");
