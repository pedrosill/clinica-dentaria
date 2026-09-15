CREATE TABLE "ClinicalNoteTreatment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clinicalNoteId" INTEGER NOT NULL,
    "procedureName" TEXT NOT NULL,
    "toothNumber" TEXT,
    "surface" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicalNoteTreatment_clinicalNoteId_fkey" FOREIGN KEY ("clinicalNoteId") REFERENCES "ClinicalNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ClinicalNoteTreatment_clinicalNoteId_createdAt_idx" ON "ClinicalNoteTreatment"("clinicalNoteId", "createdAt");

PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PatientDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT,
    "sha256" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatientDocument_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PatientDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PatientDocument" ("id", "patientId", "appointmentId", "fileName", "mimeType", "sizeBytes", "storageKey", "sha256", "version", "uploadedAt", "expiresAt", "createdById", "createdAt")
SELECT "id", "patientId", NULL, "fileName", "mimeType", "sizeBytes", "storageKey", "sha256", "version", "uploadedAt", "expiresAt", "createdById", "createdAt" FROM "PatientDocument";
DROP TABLE "PatientDocument";
ALTER TABLE "new_PatientDocument" RENAME TO "PatientDocument";
CREATE INDEX "PatientDocument_patientId_createdAt_idx" ON "PatientDocument"("patientId", "createdAt");
CREATE INDEX "PatientDocument_appointmentId_createdAt_idx" ON "PatientDocument"("appointmentId", "createdAt");
PRAGMA foreign_keys=ON;
