-- INV/F P-04B: idempotent, PII-minimized product-create command fence.
CREATE TABLE "ParasutProductCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "lookupFingerprint" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "approvedById" TEXT,
    "providerProductId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ParasutProductCommand_workspaceId_requestFingerprint_key" ON "ParasutProductCommand"("workspaceId", "requestFingerprint");
CREATE INDEX "ParasutProductCommand_workspaceId_companyId_status_idx" ON "ParasutProductCommand"("workspaceId", "companyId", "status");
CREATE INDEX "ParasutProductCommand_connectionId_status_idx" ON "ParasutProductCommand"("connectionId", "status");
