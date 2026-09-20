-- CreateTable
CREATE TABLE "InventoryHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "spaceRef" TEXT NOT NULL,
    "holdToken" TEXT NOT NULL,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'held',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryHold_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryHold_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryHold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryHold_holdToken_key" ON "InventoryHold"("holdToken");

-- CreateIndex
CREATE INDEX "InventoryHold_workspaceId_eventId_status_idx" ON "InventoryHold"("workspaceId", "eventId", "status");

-- CreateIndex
CREATE INDEX "InventoryHold_expiresAt_status_idx" ON "InventoryHold"("expiresAt", "status");
