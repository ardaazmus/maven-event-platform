-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InventoryHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "spaceRef" TEXT NOT NULL,
    "holdToken" TEXT NOT NULL,
    "orderId" TEXT,
    "assignedTicketId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'held',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryHold_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryHold_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryHold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryHold_assignedTicketId_fkey" FOREIGN KEY ("assignedTicketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InventoryHold" ("createdAt", "eventId", "expiresAt", "holdToken", "id", "orderId", "spaceRef", "status", "workspaceId") SELECT "createdAt", "eventId", "expiresAt", "holdToken", "id", "orderId", "spaceRef", "status", "workspaceId" FROM "InventoryHold";
DROP TABLE "InventoryHold";
ALTER TABLE "new_InventoryHold" RENAME TO "InventoryHold";
CREATE UNIQUE INDEX "InventoryHold_holdToken_key" ON "InventoryHold"("holdToken");
CREATE INDEX "InventoryHold_workspaceId_eventId_status_idx" ON "InventoryHold"("workspaceId", "eventId", "status");
CREATE INDEX "InventoryHold_expiresAt_status_idx" ON "InventoryHold"("expiresAt", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
