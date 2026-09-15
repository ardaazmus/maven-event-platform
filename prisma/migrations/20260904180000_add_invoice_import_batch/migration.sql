-- INV/F I-00: private accounting import uploads remain quarantined until later parser/scan gates.
CREATE TABLE "InvoiceImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'accounting_upload',
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'quarantined',
    "state" TEXT NOT NULL DEFAULT 'quarantined',
    "quarantineReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceImportBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceImportBatch_storageKey_key" ON "InvoiceImportBatch"("storageKey");
CREATE UNIQUE INDEX "InvoiceImportBatch_workspaceId_sha256_key" ON "InvoiceImportBatch"("workspaceId", "sha256");
CREATE INDEX "InvoiceImportBatch_workspaceId_state_createdAt_idx" ON "InvoiceImportBatch"("workspaceId", "state", "createdAt");
