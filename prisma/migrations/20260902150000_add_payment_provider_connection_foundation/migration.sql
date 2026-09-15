-- PAY-04A: workspace-scoped provider connection foundation.
-- credentialsEnvelope is an authenticated encrypted envelope, never card data.
CREATE TABLE "PaymentProviderConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'test',
    "displayName" TEXT NOT NULL,
    "publicConfigJson" TEXT NOT NULL DEFAULT '{}',
    "credentialsEnvelope" TEXT,
    "credentialKeyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentProviderConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentProviderConnection_workspaceId_provider_mode_key" ON "PaymentProviderConnection"("workspaceId", "provider", "mode");
CREATE INDEX "PaymentProviderConnection_workspaceId_status_idx" ON "PaymentProviderConnection"("workspaceId", "status");
