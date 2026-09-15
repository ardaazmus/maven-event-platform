-- INV/F M-04: private invoice artifacts and separate delivery intents.
-- Original documents remain private and quarantined until scan/validation succeeds.
CREATE TABLE "InvoiceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceRecordId" TEXT NOT NULL,
    "artifactKind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'pending',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "state" TEXT NOT NULL DEFAULT 'quarantined',
    "quarantineReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" DATETIME,
    CONSTRAINT "InvoiceDocument_invoiceRecordId_fkey" FOREIGN KEY ("invoiceRecordId") REFERENCES "InvoiceRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "InvoiceDeliveryIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceRecordId" TEXT NOT NULL,
    "documentId" TEXT,
    "channel" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "outboxEventId" TEXT,
    CONSTRAINT "InvoiceDeliveryIntent_invoiceRecordId_fkey" FOREIGN KEY ("invoiceRecordId") REFERENCES "InvoiceRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceDeliveryIntent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InvoiceDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InvoiceDeliveryIntent_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceDocument_storageKey_key" ON "InvoiceDocument"("storageKey");
CREATE UNIQUE INDEX "InvoiceDocument_invoiceRecordId_artifactKind_sha256_key" ON "InvoiceDocument"("invoiceRecordId", "artifactKind", "sha256");
CREATE INDEX "InvoiceDocument_invoiceRecordId_state_createdAt_idx" ON "InvoiceDocument"("invoiceRecordId", "state", "createdAt");
CREATE INDEX "InvoiceDocument_sha256_idx" ON "InvoiceDocument"("sha256");
CREATE UNIQUE INDEX "InvoiceDeliveryIntent_outboxEventId_key" ON "InvoiceDeliveryIntent"("outboxEventId");
CREATE UNIQUE INDEX "InvoiceDeliveryIntent_invoiceRecordId_channel_idempotencyKey_key" ON "InvoiceDeliveryIntent"("invoiceRecordId", "channel", "idempotencyKey");
CREATE INDEX "InvoiceDeliveryIntent_invoiceRecordId_status_availableAt_idx" ON "InvoiceDeliveryIntent"("invoiceRecordId", "status", "availableAt");
