-- PAY-05A: verified webhook metadata and idempotency inbox.
-- Raw webhook payloads are deliberately not stored.
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT,
    "paymentOrderId" TEXT,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" TEXT NOT NULL DEFAULT 'received',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "PaymentWebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentWebhookEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PaymentProviderConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentWebhookEvent_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentWebhookEvent_workspaceId_provider_externalEventId_key" ON "PaymentWebhookEvent"("workspaceId", "provider", "externalEventId");
CREATE INDEX "PaymentWebhookEvent_workspaceId_receivedAt_idx" ON "PaymentWebhookEvent"("workspaceId", "receivedAt");
CREATE INDEX "PaymentWebhookEvent_connectionId_receivedAt_idx" ON "PaymentWebhookEvent"("connectionId", "receivedAt");
CREATE INDEX "PaymentWebhookEvent_paymentOrderId_idx" ON "PaymentWebhookEvent"("paymentOrderId");
