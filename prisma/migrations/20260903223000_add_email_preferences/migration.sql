-- MAIL-10: store only workspace-scoped hashed recipient preferences.
CREATE TABLE "EmailPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "marketingOptOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailPreference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmailPreference_workspaceId_recipientHash_key" ON "EmailPreference"("workspaceId", "recipientHash");
CREATE INDEX "EmailPreference_workspaceId_marketingOptOut_idx" ON "EmailPreference"("workspaceId", "marketingOptOut");
