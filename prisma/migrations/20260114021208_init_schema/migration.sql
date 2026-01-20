-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    CONSTRAINT "Machine_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Standard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "machineId" TEXT NOT NULL,
    "t1_setup_min" REAL NOT NULL,
    "t5_run_speed_mpm" REAL NOT NULL,
    "t2_calibration_min" REAL,
    "t3_toning_min" REAL,
    "t4_approval_min" REAL,
    CONSTRAINT "Standard_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "otNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "totalMeters" REAL NOT NULL DEFAULT 0,
    "kgProduced" REAL NOT NULL DEFAULT 0,
    "kgWaste" REAL NOT NULL DEFAULT 0,
    "t1_setup_actual" REAL NOT NULL DEFAULT 0,
    "t5_run_time_actual" REAL NOT NULL DEFAULT 0,
    "t2_calibration_actual" REAL,
    "t3_toning_actual" REAL,
    "t4_approval_actual" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionOrder_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VariationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "otId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "threshold" REAL NOT NULL,
    "event" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "failedProgram" TEXT NOT NULL,
    "failureType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VariationRecord_otId_fkey" FOREIGN KEY ("otId") REFERENCES "ProductionOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variationId" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionPlan_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "VariationRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActionPlan_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AreaCoordinators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AreaCoordinators_A_fkey" FOREIGN KEY ("A") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AreaCoordinators_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AreaGestores" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AreaGestores_A_fkey" FOREIGN KEY ("A") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AreaGestores_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MachineOperators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MachineOperators_A_fkey" FOREIGN KEY ("A") REFERENCES "Machine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MachineOperators_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_otNumber_key" ON "ProductionOrder"("otNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ActionPlan_variationId_key" ON "ActionPlan"("variationId");

-- CreateIndex
CREATE UNIQUE INDEX "_AreaCoordinators_AB_unique" ON "_AreaCoordinators"("A", "B");

-- CreateIndex
CREATE INDEX "_AreaCoordinators_B_index" ON "_AreaCoordinators"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AreaGestores_AB_unique" ON "_AreaGestores"("A", "B");

-- CreateIndex
CREATE INDEX "_AreaGestores_B_index" ON "_AreaGestores"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MachineOperators_AB_unique" ON "_MachineOperators"("A", "B");

-- CreateIndex
CREATE INDEX "_MachineOperators_B_index" ON "_MachineOperators"("B");
