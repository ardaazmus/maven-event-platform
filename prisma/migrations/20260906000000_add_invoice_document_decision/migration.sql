-- P-12C-07: durable, tenant-scoped match/approval decision fence.
-- No recipient PII, provider payload, credential, or document bytes are copied.
CREATE TABLE "InvoiceDocumentDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "invoiceDocumentId" TEXT NOT NULL,
    "invoiceRecordId" TEXT NOT NULL,
    "matchStatus" TEXT NOT NULL,
    "matchStrategy" TEXT,
    "matchedInvoiceRecordId" TEXT,
    "approvalStatus" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceDocumentDecision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceDocumentDecision_invoiceDocumentId_fkey" FOREIGN KEY ("invoiceDocumentId") REFERENCES "InvoiceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceDocumentDecision_invoiceRecordId_fkey" FOREIGN KEY ("invoiceRecordId") REFERENCES "InvoiceRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceDocumentDecision_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceDocumentDecision_invoiceDocumentId_key" ON "InvoiceDocumentDecision"("invoiceDocumentId");
CREATE INDEX "InvoiceDocumentDecision_workspaceId_approvalStatus_createdAt_idx" ON "InvoiceDocumentDecision"("workspaceId", "approvalStatus", "createdAt");
CREATE INDEX "InvoiceDocumentDecision_invoiceRecordId_matchStatus_idx" ON "InvoiceDocumentDecision"("invoiceRecordId", "matchStatus");
