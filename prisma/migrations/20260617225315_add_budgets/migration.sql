-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "owner" TEXT NOT NULL,
    "workName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "observations" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" SERIAL NOT NULL,
    "budgetId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_date_idx" ON "Budget"("date");

-- CreateIndex
CREATE INDEX "BudgetItem_budgetId_idx" ON "BudgetItem"("budgetId");

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
