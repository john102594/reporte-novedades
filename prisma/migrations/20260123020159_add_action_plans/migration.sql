/*
  Warnings:

  - You are about to drop the column `deadline` on the `ActionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `responsibleId` on the `ActionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `variationId` on the `ActionPlan` table. All the data in the column will be lost.
  - Added the required column `name` to the `ActionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `ActionPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ShiftReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "shift" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "gestorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "machineId" TEXT,
    CONSTRAINT "ShiftReport_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftReport_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ShiftReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ShiftReport_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftReportItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "operatorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "ShiftReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ShiftReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShiftReportItem_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftReportItem_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftReportDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "ot" TEXT NOT NULL,
    "efficiency" REAL,
    "mtProg" REAL,
    "mtProd" REAL,
    "kgProd" REAL,
    "kgDesp" REAL,
    CONSTRAINT "ShiftReportDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShiftReportItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftReportVariation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "detailId" TEXT NOT NULL,
    "stage" TEXT,
    "programId" TEXT,
    "analysis" TEXT,
    CONSTRAINT "ShiftReportVariation_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "ShiftReportDetail" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShiftReportVariation_programId_fkey" FOREIGN KEY ("programId") REFERENCES "FailureProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variationId" TEXT NOT NULL,
    "ot" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "rootCauseAnalysis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POR_REVISAR',
    "responsibleId" TEXT,
    "actionPlanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionTask_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ShiftReportVariation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActionTask_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActionTask_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "deadline" DATETIME NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanActivity_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanActivity_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABIERTO',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "ActionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActionPlan" ("createdAt", "description", "id", "status", "updatedAt") SELECT "createdAt", "description", "id", "status", "updatedAt" FROM "ActionPlan";
DROP TABLE "ActionPlan";
ALTER TABLE "new_ActionPlan" RENAME TO "ActionPlan";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShiftReport_date_shift_areaId_key" ON "ShiftReport"("date", "shift", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionTask_variationId_key" ON "ActionTask"("variationId");
