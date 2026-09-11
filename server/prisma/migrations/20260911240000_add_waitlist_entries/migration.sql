-- Operational patient waitlist. requestedDate is stored at local midnight when supplied.
CREATE TABLE "WaitlistEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER,
    "requestedDate" DATETIME,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitlistEntry_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "WaitlistEntry_status_priority_requestedDate_idx" ON "WaitlistEntry"("status", "priority", "requestedDate");
CREATE INDEX "WaitlistEntry_patientId_status_requestedDate_idx" ON "WaitlistEntry"("patientId", "status", "requestedDate");
CREATE INDEX "WaitlistEntry_doctorId_status_requestedDate_idx" ON "WaitlistEntry"("doctorId", "status", "requestedDate");
