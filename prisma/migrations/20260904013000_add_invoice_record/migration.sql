-- INV/F M-01: authoritative invoice workflow record.
-- Provider invoice identifiers are nullable until the provider/accounting side creates them.
CREATE TABLE "InvoiceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "taxAmountMinor" INTEGER,
    "taxRateBps" INTEGER,
    "currency" TEXT NOT NULL,
    "providerInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "invoiceUuid" TEXT,
    "state" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceRecord_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceRecord_paymentOrderId_key" ON "InvoiceRecord"("paymentOrderId");
CREATE UNIQUE INDEX "InvoiceRecord_workspaceId_provider_providerInvoiceId_key" ON "InvoiceRecord"("workspaceId", "provider", "providerInvoiceId");
CREATE INDEX "InvoiceRecord_workspaceId_state_createdAt_idx" ON "InvoiceRecord"("workspaceId", "state", "createdAt");
