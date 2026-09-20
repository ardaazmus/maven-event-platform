-- CreateTable
CREATE TABLE "ExternalIdMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "coreType" TEXT NOT NULL,
    "coreId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalIdMapping_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExternalIdMapping_coreType_coreId_idx" ON "ExternalIdMapping"("coreType", "coreId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdMapping_workspaceId_sourceSystem_sourceType_sourceId_key" ON "ExternalIdMapping"("workspaceId", "sourceSystem", "sourceType", "sourceId");
