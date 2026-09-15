-- MAIL-06: verified provider events are stored without raw payloads.
CREATE TABLE "EmailProviderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "payloadHash" TEXT NOT NULL,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" TEXT NOT NULL DEFAULT 'received',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "lockedUntil" DATETIME,
    "lockedBy" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "EmailProviderEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmailProviderEvent_workspaceId_provider_externalEventId_key" ON "EmailProviderEvent"("workspaceId", "provider", "externalEventId");
CREATE INDEX "EmailProviderEvent_workspaceId_receivedAt_idx" ON "EmailProviderEvent"("workspaceId", "receivedAt");
CREATE INDEX "EmailProviderEvent_processingStatus_lockedUntil_idx" ON "EmailProviderEvent"("processingStatus", "lockedUntil");
CREATE INDEX "EmailProviderEvent_recipientEmail_provider_idx" ON "EmailProviderEvent"("recipientEmail", "provider");
