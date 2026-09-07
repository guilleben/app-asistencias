-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('OK', 'IN_REPAIR', 'LOST');

-- CreateEnum
CREATE TYPE "ToolMovementKind" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'TRANSFER_OUT', 'TRANSFER_IN', 'STATUS_CHANGED');

-- AlterTable
ALTER TABLE "SiteTool" ADD COLUMN "status" "ToolStatus" NOT NULL DEFAULT 'OK';

-- CreateTable
CREATE TABLE "SiteToolMovement" (
    "id" SERIAL NOT NULL,
    "siteToolId" INTEGER,
    "siteId" INTEGER NOT NULL,
    "toolName" TEXT NOT NULL,
    "kind" "ToolMovementKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityAfter" INTEGER,
    "status" "ToolStatus",
    "fromSiteId" INTEGER,
    "toSiteId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteToolMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteToolMovement_siteId_idx" ON "SiteToolMovement"("siteId");

-- CreateIndex
CREATE INDEX "SiteToolMovement_createdAt_idx" ON "SiteToolMovement"("createdAt");

-- CreateIndex
CREATE INDEX "SiteToolMovement_toolName_idx" ON "SiteToolMovement"("toolName");

-- AddForeignKey
ALTER TABLE "SiteToolMovement" ADD CONSTRAINT "SiteToolMovement_siteToolId_fkey" FOREIGN KEY ("siteToolId") REFERENCES "SiteTool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteToolMovement" ADD CONSTRAINT "SiteToolMovement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
