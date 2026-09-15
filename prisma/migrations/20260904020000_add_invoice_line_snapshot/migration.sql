-- INV/F M-02: immutable invoice line calculation snapshot.
-- Monetary fields are integer minor units; quantity is a canonical decimal string.
CREATE TABLE "InvoiceLineSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceRecordId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "taxRateBps" INTEGER,
    "taxAmountMinor" INTEGER,
    "discountAmountMinor" INTEGER,
    "lineTotalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceLineSnapshot_invoiceRecordId_fkey" FOREIGN KEY ("invoiceRecordId") REFERENCES "InvoiceRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceLineSnapshot_invoiceRecordId_lineNumber_key" ON "InvoiceLineSnapshot"("invoiceRecordId", "lineNumber");
CREATE INDEX "InvoiceLineSnapshot_invoiceRecordId_createdAt_idx" ON "InvoiceLineSnapshot"("invoiceRecordId", "createdAt");
