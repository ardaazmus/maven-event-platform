-- Secure destructive-action confirmation: code hashes only, never the raw email code.
CREATE TABLE "DangerousActionChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DangerousActionChallenge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DangerousActionChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DangerousActionChallenge_workspaceId_userId_action_createdAt_idx"
ON "DangerousActionChallenge"("workspaceId", "userId", "action", "createdAt");
CREATE INDEX "DangerousActionChallenge_expiresAt_consumedAt_idx"
ON "DangerousActionChallenge"("expiresAt", "consumedAt");
