-- Data governance foundation. Policies are intentionally disabled and have no duration.
CREATE TABLE "ClinicalNoteAddendum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "noteId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicalNoteAddendum_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "ClinicalNote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClinicalNoteAddendum_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClinicalNoteAddendum_noteId_version_key" ON "ClinicalNoteAddendum"("noteId", "version");
CREATE INDEX "ClinicalNoteAddendum_noteId_createdAt_idx" ON "ClinicalNoteAddendum"("noteId", "createdAt");

CREATE TABLE "AuditEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorId" INTEGER,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "patientId" INTEGER,
    "result" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "metadataJson" TEXT
);
CREATE INDEX "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");
CREATE INDEX "AuditEvent_resource_action_timestamp_idx" ON "AuditEvent"("resource", "action", "timestamp");
CREATE INDEX "AuditEvent_patientId_timestamp_idx" ON "AuditEvent"("patientId", "timestamp");
CREATE INDEX "AuditEvent_actorId_timestamp_idx" ON "AuditEvent"("actorId", "timestamp");

CREATE TABLE "ConsentRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'granted',
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" DATETIME,
    "recordedById" INTEGER,
    "signatureReference" TEXT,
    CONSTRAINT "ConsentRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsentRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ConsentRecord_patientId_status_idx" ON "ConsentRecord"("patientId", "status");

CREATE TABLE "PatientDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatientDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PatientDocument_patientId_createdAt_idx" ON "PatientDocument"("patientId", "createdAt");

CREATE TABLE "DataSubjectRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" INTEGER,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    CONSTRAINT "DataSubjectRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataSubjectRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "DataSubjectRequest_patientId_status_idx" ON "DataSubjectRequest"("patientId", "status");
CREATE INDEX "DataSubjectRequest_status_requestedAt_idx" ON "DataSubjectRequest"("status", "requestedAt");

CREATE TABLE "RetentionPolicy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "resourceType" TEXT NOT NULL,
    "durationDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT 0,
    "description" TEXT,
    "updatedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetentionPolicy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RetentionPolicy_resourceType_key" ON "RetentionPolicy"("resourceType");

CREATE TABLE "RetentionHold" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER,
    "resourceType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    "createdById" INTEGER,
    CONSTRAINT "RetentionHold_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RetentionHold_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RetentionHold_patientId_resourceType_releasedAt_idx" ON "RetentionHold"("patientId", "resourceType", "releasedAt");

INSERT INTO "RetentionPolicy" ("resourceType", "isActive", "durationDays", "description", "updatedAt") VALUES
  ('patient', 0, NULL, 'Configure only after clinic approval', CURRENT_TIMESTAMP),
  ('clinical_note', 0, NULL, 'Configure only after clinic approval', CURRENT_TIMESTAMP),
  ('document', 0, NULL, 'Configure only after clinic approval', CURRENT_TIMESTAMP);

-- Keep final notes and audit events append-only at the database boundary too.
CREATE TRIGGER "ClinicalNote_final_update_guard"
BEFORE UPDATE ON "ClinicalNote"
WHEN OLD."status" = 'final' AND (
  NEW."patientId" IS NOT OLD."patientId" OR
  NEW."authorId" IS NOT OLD."authorId" OR
  NEW."chiefComplaint" IS NOT OLD."chiefComplaint" OR
  NEW."clinicalFindings" IS NOT OLD."clinicalFindings" OR
  NEW."diagnosis" IS NOT OLD."diagnosis" OR
  NEW."treatmentPerformed" IS NOT OLD."treatmentPerformed" OR
  NEW."recommendations" IS NOT OLD."recommendations" OR
  NEW."status" IS NOT OLD."status" OR
  NEW."signedAt" IS NOT OLD."signedAt"
)
BEGIN
  SELECT RAISE(ABORT, 'Final clinical notes cannot be edited');
END;
CREATE TRIGGER "AuditEvent_update_guard"
BEFORE UPDATE ON "AuditEvent"
BEGIN
  SELECT RAISE(ABORT, 'Audit events are append-only');
END;
CREATE TRIGGER "AuditEvent_delete_guard"
BEFORE DELETE ON "AuditEvent"
BEGIN
  SELECT RAISE(ABORT, 'Audit events are append-only');
END;
