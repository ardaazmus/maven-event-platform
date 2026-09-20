-- CreateTable
CREATE TABLE "CheckInEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "occurrenceId" TEXT,
    "gate" TEXT,
    "deviceId" TEXT,
    "operatorId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'entry',
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckInEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckInEvent_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckInEvent_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "EventOccurrence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CheckInEvent_workspaceId_occurredAt_idx" ON "CheckInEvent"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_credentialId_occurredAt_idx" ON "CheckInEvent"("credentialId", "occurredAt");
