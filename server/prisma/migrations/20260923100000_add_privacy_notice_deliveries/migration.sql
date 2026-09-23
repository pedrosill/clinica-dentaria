CREATE TABLE "PrivacyNoticeDelivery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "objectedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivacyNoticeDelivery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrivacyNoticeDelivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PrivacyNoticeDelivery_tokenHash_key" ON "PrivacyNoticeDelivery"("tokenHash");
CREATE INDEX "PrivacyNoticeDelivery_patientId_createdAt_idx" ON "PrivacyNoticeDelivery"("patientId", "createdAt");
CREATE INDEX "PrivacyNoticeDelivery_status_expiresAt_idx" ON "PrivacyNoticeDelivery"("status", "expiresAt");
