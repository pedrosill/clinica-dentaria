-- A waitlist request can be resolved only by linking it to the appointment that fulfilled it.
ALTER TABLE "WaitlistEntry" ADD COLUMN "appointmentId" INTEGER REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "WaitlistEntry_appointmentId_key" ON "WaitlistEntry"("appointmentId");
