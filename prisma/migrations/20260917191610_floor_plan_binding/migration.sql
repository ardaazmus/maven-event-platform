-- CreateTable
CREATE TABLE "FloorPlanBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "externalPlanId" TEXT NOT NULL,
    "planVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FloorPlanBinding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FloorPlanBinding_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FloorPlanBinding_workspaceId_eventId_idx" ON "FloorPlanBinding"("workspaceId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlanBinding_eventId_externalPlanId_key" ON "FloorPlanBinding"("eventId", "externalPlanId");
