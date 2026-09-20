-- CreateTable
CREATE TABLE "CheckoutIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'iyzico',
    "mode" TEXT NOT NULL DEFAULT 'test',
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "amountMinor" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckoutIntent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckoutIntent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutIntent_idempotencyKey_key" ON "CheckoutIntent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CheckoutIntent_workspaceId_status_idx" ON "CheckoutIntent"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CheckoutIntent_orderId_idx" ON "CheckoutIntent"("orderId");
