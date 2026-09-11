-- Persistent patient recall/follow-up queue. dueDate is stored at local midnight.
CREATE TABLE "PatientRecall" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "doctorId" INTEGER,
    "dueDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'due',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PatientRecall_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatientRecall_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PatientRecall_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PatientRecall_patientId_dueDate_idx" ON "PatientRecall"("patientId", "dueDate");
CREATE INDEX "PatientRecall_status_dueDate_idx" ON "PatientRecall"("status", "dueDate");
CREATE INDEX "PatientRecall_doctorId_status_dueDate_idx" ON "PatientRecall"("doctorId", "status", "dueDate");
CREATE INDEX "PatientRecall_patientId_status_dueDate_idx" ON "PatientRecall"("patientId", "status", "dueDate");
