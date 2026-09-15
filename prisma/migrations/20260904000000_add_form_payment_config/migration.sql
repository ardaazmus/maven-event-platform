-- PAY-06D-01: form-level payment policy without exposing provider secrets.
CREATE TABLE "FormPaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "mode" TEXT NOT NULL DEFAULT 'test',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pricingPolicyJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormPaymentConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormPaymentConfig_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormPaymentConfig_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PaymentProviderConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FormPaymentConfig_formId_key" ON "FormPaymentConfig"("formId");
CREATE INDEX "FormPaymentConfig_workspaceId_enabled_idx" ON "FormPaymentConfig"("workspaceId", "enabled");
CREATE INDEX "FormPaymentConfig_workspaceId_provider_mode_idx" ON "FormPaymentConfig"("workspaceId", "provider", "mode");
