ALTER TABLE "ClinicalNote" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'clinical';
ALTER TABLE "ClinicalNote" ADD COLUMN "transcriptionStatus" TEXT NOT NULL DEFAULT 'not_applicable';
ALTER TABLE "ClinicalNote" ADD COLUMN "transcribedById" INTEGER;
ALTER TABLE "ClinicalNote" ADD COLUMN "transcribedAt" DATETIME;
ALTER TABLE "ClinicalNote" ADD COLUMN "validatedById" INTEGER;
ALTER TABLE "ClinicalNote" ADD COLUMN "validatedAt" DATETIME;
ALTER TABLE "PatientDocument" ADD COLUMN "sha256" TEXT;
ALTER TABLE "PatientDocument" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PatientDocument" ADD COLUMN "uploadedAt" DATETIME;
ALTER TABLE "PatientDocument" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "DataSubjectRequest" ADD COLUMN "reviewedById" INTEGER;
ALTER TABLE "DataSubjectRequest" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "DataSubjectRequest" ADD COLUMN "responseReference" TEXT;

CREATE TABLE "ComplianceItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "validationMode" TEXT NOT NULL DEFAULT 'manual',
    "automaticState" TEXT NOT NULL DEFAULT 'not_checked',
    "manualState" TEXT NOT NULL DEFAULT 'pending',
    "evidence" TEXT,
    "notes" TEXT,
    "ownerId" INTEGER,
    "approvedById" INTEGER,
    "approvedAt" DATETIME,
    "reviewDueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ComplianceItem_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ComplianceItem_code_key" ON "ComplianceItem"("code");
CREATE INDEX "ComplianceItem_category_manualState_idx" ON "ComplianceItem"("category", "manualState");
CREATE INDEX "ComplianceItem_automaticState_idx" ON "ComplianceItem"("automaticState");
CREATE INDEX "ClinicalNote_transcribedById_idx" ON "ClinicalNote"("transcribedById");
CREATE INDEX "ClinicalNote_validatedById_idx" ON "ClinicalNote"("validatedById");
CREATE INDEX "DataSubjectRequest_reviewedById_idx" ON "DataSubjectRequest"("reviewedById");
