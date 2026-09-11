-- CreateTable
CREATE TABLE "ClinicSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clinicName" TEXT NOT NULL DEFAULT 'DentalPro',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClinicSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settingsId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '20:00',
    "breakStart" TEXT,
    "breakEnd" TEXT,
    CONSTRAINT "ClinicSchedule_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "ClinicSettings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClinicClosure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settingsId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "ClinicClosure_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "ClinicSettings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settingsId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentType_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "ClinicSettings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "doctorId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '20:00',
    "breakStart" TEXT,
    "breakEnd" TEXT,
    CONSTRAINT "ProviderSchedule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicSchedule_settingsId_weekday_key" ON "ClinicSchedule"("settingsId", "weekday");
CREATE UNIQUE INDEX "ClinicClosure_settingsId_date_key" ON "ClinicClosure"("settingsId", "date");
CREATE INDEX "ClinicClosure_date_idx" ON "ClinicClosure"("date");
CREATE UNIQUE INDEX "AppointmentType_settingsId_name_key" ON "AppointmentType"("settingsId", "name");
CREATE UNIQUE INDEX "ProviderSchedule_doctorId_weekday_key" ON "ProviderSchedule"("doctorId", "weekday");
