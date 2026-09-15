-- INV/F M-00: immutable invoice recipient snapshot metadata.
-- Sensitive values are stored in encrypted application envelopes.
CREATE TABLE "InvoiceRecipientSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "submissionId" TEXT,
    "recipientType" TEXT NOT NULL,
    "legalNameEncrypted" TEXT,
    "taxNumberEncrypted" TEXT,
    "taxOfficeEncrypted" TEXT,
    "identityNumberEncrypted" TEXT,
    "emailEncrypted" TEXT,
    "billingAddressEncrypted" TEXT,
    "countryCode" TEXT,
    "source" TEXT NOT NULL,
    "noticeVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceRecipientSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceRecipientSnapshot_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceRecipientSnapshot_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceRecipientSnapshot_paymentOrderId_key" ON "InvoiceRecipientSnapshot"("paymentOrderId");
CREATE INDEX "InvoiceRecipientSnapshot_workspaceId_createdAt_idx" ON "InvoiceRecipientSnapshot"("workspaceId", "createdAt");
CREATE INDEX "InvoiceRecipientSnapshot_workspaceId_recipientType_idx" ON "InvoiceRecipientSnapshot"("workspaceId", "recipientType");
