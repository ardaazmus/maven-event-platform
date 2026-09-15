-- MAIL-13B: workspace-scoped email provider credentials and webhook secret envelopes.
CREATE TABLE "EmailProviderConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "publicConfigJson" TEXT NOT NULL DEFAULT '{}',
    "credentialsEnvelope" TEXT,
    "webhookSecretEnvelope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailProviderConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmailProviderConnection_workspaceId_provider_key" ON "EmailProviderConnection"("workspaceId", "provider");
CREATE INDEX "EmailProviderConnection_workspaceId_status_idx" ON "EmailProviderConnection"("workspaceId", "status");
