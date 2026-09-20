-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT,
    "payerName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "amountMinor" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "valueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "recorderId" TEXT NOT NULL,
    "approverId" TEXT,
    "evidenceHash" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "reversalOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amountMinor", "approverId", "createdAt", "currency", "evidenceHash", "id", "idempotencyKey", "method", "orderId", "payerName", "recorderId", "reference", "source", "status", "updatedAt", "valueDate", "workspaceId") SELECT "amountMinor", "approverId", "createdAt", "currency", "evidenceHash", "id", "idempotencyKey", "method", "orderId", "payerName", "recorderId", "reference", "source", "status", "updatedAt", "valueDate", "workspaceId" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_workspaceId_status_idx" ON "Payment"("workspaceId", "status");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
