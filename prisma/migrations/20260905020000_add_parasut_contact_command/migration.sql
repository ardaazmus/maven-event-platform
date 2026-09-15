-- INV/F P-03B: idempotent, PII-minimized contact-create command fence.
CREATE TABLE "ParasutContactCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "approvedById" TEXT,
    "providerContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ParasutContactCommand_workspaceId_requestFingerprint_key" ON "ParasutContactCommand"("workspaceId", "requestFingerprint");
CREATE INDEX "ParasutContactCommand_workspaceId_companyId_status_idx" ON "ParasutContactCommand"("workspaceId", "companyId", "status");
CREATE INDEX "ParasutContactCommand_connectionId_status_idx" ON "ParasutContactCommand"("connectionId", "status");
