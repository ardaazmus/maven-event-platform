-- CreateTable
CREATE TABLE "InvoiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT,
    "recipientType" TEXT NOT NULL,
    "legalNameEncrypted" TEXT,
    "taxNumberEncrypted" TEXT,
    "taxOfficeEncrypted" TEXT,
    "identityNumberEncrypted" TEXT,
    "emailEncrypted" TEXT,
    "billingAddressEncrypted" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'TR',
    "lineSnapshotJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InvoiceRequest_workspaceId_status_idx" ON "InvoiceRequest"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "InvoiceRequest_orderId_idx" ON "InvoiceRequest"("orderId");
