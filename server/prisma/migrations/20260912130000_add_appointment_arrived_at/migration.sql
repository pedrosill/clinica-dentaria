ALTER TABLE "Appointment" ADD COLUMN "arrivedAt" DATETIME;

CREATE INDEX "Appointment_status_arrivedAt_idx" ON "Appointment"("status", "arrivedAt");
