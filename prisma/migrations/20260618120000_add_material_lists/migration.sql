-- CreateTable
CREATE TABLE "MaterialList" (
    "id" SERIAL NOT NULL,
    "owner" TEXT NOT NULL,
    "workName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialListItem" (
    "id" SERIAL NOT NULL,
    "materialListId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialList_date_idx" ON "MaterialList"("date");

-- CreateIndex
CREATE INDEX "MaterialListItem_materialListId_idx" ON "MaterialListItem"("materialListId");

-- AddForeignKey
ALTER TABLE "MaterialListItem" ADD CONSTRAINT "MaterialListItem_materialListId_fkey" FOREIGN KEY ("materialListId") REFERENCES "MaterialList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
