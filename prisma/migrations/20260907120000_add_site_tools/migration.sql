-- CreateTable
CREATE TABLE "SiteTool" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteTool_siteId_idx" ON "SiteTool"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTool_siteId_name_key" ON "SiteTool"("siteId", "name");

-- AddForeignKey
ALTER TABLE "SiteTool" ADD CONSTRAINT "SiteTool_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
