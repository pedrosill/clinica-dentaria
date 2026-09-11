-- Add the clinic-wide interface language. Existing installations remain in English.
ALTER TABLE "ClinicSettings" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
