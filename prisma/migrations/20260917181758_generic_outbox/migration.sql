-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OutboxEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "formId" TEXT,
    "submissionId" TEXT,
    "eventType" TEXT,
    "eventId" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "aggregateType" TEXT,
    "aggregateId" TEXT,
    "correlationId" TEXT,
    "causationId" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "queueClass" TEXT,
    "deliveryStatus" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" DATETIME,
    "lockedBy" TEXT,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "OutboxEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutboxEvent_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OutboxEvent" ("attemptCount", "availableAt", "createdAt", "deliveryStatus", "formId", "id", "lastError", "lockedBy", "lockedUntil", "payloadJson", "priority", "provider", "providerMessageId", "queueClass", "sentAt", "status", "submissionId", "type", "workspaceId") SELECT "attemptCount", "availableAt", "createdAt", "deliveryStatus", "formId", "id", "lastError", "lockedBy", "lockedUntil", "payloadJson", "priority", "provider", "providerMessageId", "queueClass", "sentAt", "status", "submissionId", "type", "workspaceId" FROM "OutboxEvent";
DROP TABLE "OutboxEvent";
ALTER TABLE "new_OutboxEvent" RENAME TO "OutboxEvent";
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_queueClass_priority_status_availableAt_idx" ON "OutboxEvent"("queueClass", "priority", "status", "availableAt");
CREATE INDEX "OutboxEvent_workspaceId_formId_idx" ON "OutboxEvent"("workspaceId", "formId");
CREATE INDEX "OutboxEvent_workspaceId_provider_providerMessageId_idx" ON "OutboxEvent"("workspaceId", "provider", "providerMessageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
