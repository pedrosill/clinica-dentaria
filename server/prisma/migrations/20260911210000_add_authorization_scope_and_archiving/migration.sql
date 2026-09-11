-- Add non-destructive archive markers used by the server instead of physical deletes.
ALTER TABLE "Patient" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Appointment" ADD COLUMN "archivedAt" DATETIME;

-- Link a dentist login to exactly one Doctor profile so clinical scope is explicit.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Doctor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "nif" TEXT,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Doctor" ("id", "name", "email", "phone", "nif", "createdAt")
SELECT "id", "name", "email", "phone", "nif", "createdAt" FROM "Doctor";
DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");
PRAGMA foreign_keys=ON;

CREATE INDEX "Patient_archivedAt_idx" ON "Patient"("archivedAt");
CREATE INDEX "Appointment_archivedAt_idx" ON "Appointment"("archivedAt");
