-- CreateTable
CREATE TABLE "CategoryRate" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "dailyRate" DECIMAL(12,2) NOT NULL,
    "retroWeekly" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryRate_categoryId_effectiveFrom_idx" ON "CategoryRate"("categoryId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRate_categoryId_effectiveFrom_key" ON "CategoryRate"("categoryId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "CategoryRate" ADD CONSTRAINT "CategoryRate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill initial rates for existing categories
INSERT INTO "CategoryRate" ("categoryId", "dailyRate", "retroWeekly", "effectiveFrom", "createdAt")
SELECT "id", "dailyRate", "retroWeekly", '2020-01-01'::date, CURRENT_TIMESTAMP
FROM "Category";
