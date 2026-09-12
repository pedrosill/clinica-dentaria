CREATE TABLE "AppointmentConfirmation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appointmentId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "respondedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentConfirmation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AppointmentConfirmation_tokenHash_key" ON "AppointmentConfirmation"("tokenHash");
CREATE INDEX "AppointmentConfirmation_appointmentId_status_idx" ON "AppointmentConfirmation"("appointmentId", "status");
CREATE INDEX "AppointmentConfirmation_expiresAt_status_idx" ON "AppointmentConfirmation"("expiresAt", "status");
