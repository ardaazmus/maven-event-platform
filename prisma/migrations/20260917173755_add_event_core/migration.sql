/*
  Warnings:

  - Made the column `publicKey` on table `PaymentOrder` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "venue" TEXT,
    "hall" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventOccurrence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicKey" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submissionId" TEXT,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'test',
    "providerOrderId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "publishedVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentOrder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentOrder_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentOrder_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaymentOrder" ("amountMinor", "createdAt", "currency", "formId", "id", "idempotencyKey", "mode", "provider", "providerOrderId", "publicKey", "publishedVersionId", "status", "submissionId", "updatedAt", "workspaceId") SELECT "amountMinor", "createdAt", "currency", "formId", "id", "idempotencyKey", "mode", "provider", "providerOrderId", "publicKey", "publishedVersionId", "status", "submissionId", "updatedAt", "workspaceId" FROM "PaymentOrder";
DROP TABLE "PaymentOrder";
ALTER TABLE "new_PaymentOrder" RENAME TO "PaymentOrder";
CREATE UNIQUE INDEX "PaymentOrder_publicKey_key" ON "PaymentOrder"("publicKey");
CREATE INDEX "PaymentOrder_workspaceId_formId_createdAt_idx" ON "PaymentOrder"("workspaceId", "formId", "createdAt");
CREATE INDEX "PaymentOrder_submissionId_idx" ON "PaymentOrder"("submissionId");
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");
CREATE INDEX "PaymentOrder_provider_mode_providerOrderId_idx" ON "PaymentOrder"("provider", "mode", "providerOrderId");
CREATE UNIQUE INDEX "PaymentOrder_workspaceId_idempotencyKey_key" ON "PaymentOrder"("workspaceId", "idempotencyKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Event_workspaceId_status_idx" ON "Event"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "EventOccurrence_eventId_startsAt_idx" ON "EventOccurrence"("eventId", "startsAt");

-- RedefineIndex
DROP INDEX "OutboxEvent_queueClass_priority_idx";
CREATE INDEX "OutboxEvent_queueClass_priority_status_availableAt_idx" ON "OutboxEvent"("queueClass", "priority", "status", "availableAt");
