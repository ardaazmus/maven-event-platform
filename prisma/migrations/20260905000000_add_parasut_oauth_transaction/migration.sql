-- INV/F P-01B: tenant-bound OAuth transaction and encrypted Paraşüt connection.
CREATE TABLE "ParasutConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "companyId" TEXT,
    "credentialsEnvelope" TEXT,
    "credentialKeyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParasutConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ParasutConnection_workspaceId_key" ON "ParasutConnection"("workspaceId");
CREATE INDEX "ParasutConnection_workspaceId_status_idx" ON "ParasutConnection"("workspaceId", "status");

CREATE TABLE "ParasutOAuthTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "bindingHash" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParasutOAuthTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParasutOAuthTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ParasutOAuthTransaction_stateHash_key" ON "ParasutOAuthTransaction"("stateHash");
CREATE INDEX "ParasutOAuthTransaction_workspaceId_status_expiresAt_idx" ON "ParasutOAuthTransaction"("workspaceId", "status", "expiresAt");
CREATE INDEX "ParasutOAuthTransaction_userId_status_expiresAt_idx" ON "ParasutOAuthTransaction"("userId", "status", "expiresAt");
