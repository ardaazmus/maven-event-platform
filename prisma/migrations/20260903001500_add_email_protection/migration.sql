-- MAIL-14A: durable workspace-scoped email suppression and marketing pause state.
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailSuppression_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmailSuppression_workspaceId_recipientHash_scope_key" ON "EmailSuppression"("workspaceId", "recipientHash", "scope");
CREATE INDEX "EmailSuppression_workspaceId_reason_idx" ON "EmailSuppression"("workspaceId", "reason");
CREATE INDEX "EmailSuppression_workspaceId_sourceProvider_sourceEventId_idx" ON "EmailSuppression"("workspaceId", "sourceProvider", "sourceEventId");

CREATE TABLE "WorkspaceEmailProtection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "marketingPaused" BOOLEAN NOT NULL DEFAULT false,
    "pauseReason" TEXT,
    "pausedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceEmailProtection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkspaceEmailProtection_workspaceId_key" ON "WorkspaceEmailProtection"("workspaceId");
